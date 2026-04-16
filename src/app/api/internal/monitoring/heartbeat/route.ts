import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAllMarketOdds } from "@/lib/market-betting"
import { getSettlementOutboxHealth } from "@/lib/reliability"
import { calculateMaxLiability, calculatePoolImbalance, RISK_CONFIG } from "@/lib/risk-engine"
import markets from "@/data/markets.json"

function isAuthorized(request: Request): boolean {
  const configuredSecrets = [process.env.MONITORING_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value)
  )
  if (configuredSecrets.length === 0) return false

  const byHeader = request.headers.get("x-monitoring-secret")
  if (byHeader && configuredSecrets.includes(byHeader)) return true

  const auth = request.headers.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined
  return Boolean(bearer && configuredSecrets.includes(bearer))
}

async function notifyWebhook(payload: unknown): Promise<{ sent: boolean; error?: string }> {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return { sent: false }

  try {
    const token = process.env.ALERT_WEBHOOK_TOKEN
    const headers: Record<string, string> = {
      "content-type": "application/json",
    }
    if (token) {
      headers.authorization = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return { sent: false, error: `Webhook returned ${response.status}` }
    }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown webhook error"
    return { sent: false, error: message }
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const outbox = await getSettlementOutboxHealth()
    const allOdds = await getAllMarketOdds()

    const since = new Date(new Date(outbox.now).getTime() - 24 * 60 * 60 * 1000)
    const fraudBlocked24h = await db.auditLog.count({
      where: {
        action: "MARKET_BET_FRAUD_BLOCKED",
        createdAt: { gte: since },
      },
    })

    const criticalMarkets = markets.markets.reduce((count, market) => {
      const snapshot = allOdds.find((item) => item.marketId === market.id)
      const pool = Object.fromEntries(
        (snapshot?.outcomes ?? []).map((outcome) => [outcome.outcome, outcome.poolCents])
      )
      const houseMarginBps = snapshot?.houseMarginBps ?? 500
      const liability = calculateMaxLiability(pool, houseMarginBps)
      const imbalance = calculatePoolImbalance(pool)
      const liabilityRatio = liability / RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS
      return liabilityRatio >= 0.9 || imbalance >= 0.8 ? count + 1 : count
    }, 0)

    const alerts: string[] = []
    let status: "ok" | "warn" | "critical" = "ok"

    if (outbox.staleProcessingCount > 0) {
      alerts.push("OUTBOX_STALE_PROCESSING")
      status = "critical"
    }
    if (outbox.pendingCount > 200) {
      alerts.push("OUTBOX_PENDING_BACKLOG_HIGH")
      if (status === "ok") status = "warn"
    }
    if (outbox.oldestPendingAgeSeconds > 300) {
      alerts.push("OUTBOX_OLDEST_PENDING_AGE_HIGH")
      status = "critical"
    }
    if (outbox.oldestProcessingAgeSeconds > outbox.leaseSeconds) {
      alerts.push("OUTBOX_OLDEST_PROCESSING_AGE_HIGH")
      if (status === "ok") status = "warn"
    }
    if (criticalMarkets > 0) {
      alerts.push("RISK_CRITICAL_MARKETS_PRESENT")
      if (status === "ok") status = "warn"
    }
    if (fraudBlocked24h > 100) {
      alerts.push("FRAUD_BLOCKED_24H_SURGE")
      if (status === "ok") status = "warn"
    }

    const payload = {
      source: "weka-pesa-monitoring",
      status,
      generatedAt: outbox.now,
      alerts,
      outbox,
      risk: {
        criticalMarkets,
        fraudBlocked24h,
      },
    }

    const webhook = status === "ok" ? { sent: false } : await notifyWebhook(payload)

    return NextResponse.json({
      success: true,
      ...payload,
      webhook,
    })
  } catch (err) {
    console.error("[INTERNAL_MONITORING_HEARTBEAT]", err)
    return NextResponse.json({ error: "Monitoring heartbeat failed." }, { status: 500 })
  }
}
