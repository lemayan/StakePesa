import { NextResponse } from "next/server"

type RelayPayload = {
  source?: string
  status?: "ok" | "warn" | "critical"
  generatedAt?: string
  alerts?: string[]
  outbox?: {
    pendingCount?: number
    staleProcessingCount?: number
    oldestPendingAgeSeconds?: number
    oldestProcessingAgeSeconds?: number
  }
  risk?: {
    criticalMarkets?: number
    fraudBlocked24h?: number
  }
}

function isAuthorized(request: Request): boolean {
  const token = process.env.ALERT_WEBHOOK_TOKEN
  if (!token) return false

  const auth = request.headers.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined
  return bearer === token
}

function formatSlackMessage(payload: RelayPayload): string {
  const status = payload.status ?? "warn"
  const emoji = status === "critical" ? ":rotating_light:" : status === "warn" ? ":warning:" : ":white_check_mark:"
  const alerts = payload.alerts && payload.alerts.length > 0 ? payload.alerts.join(", ") : "none"

  return [
    `${emoji} *Weka Pesa Monitoring Alert*`,
    `Status: *${status.toUpperCase()}*`,
    `Generated: ${payload.generatedAt ?? new Date().toISOString()}`,
    `Alerts: ${alerts}`,
    `Outbox pending: ${payload.outbox?.pendingCount ?? 0}`,
    `Outbox stale processing: ${payload.outbox?.staleProcessingCount ?? 0}`,
    `Outbox oldest pending age (s): ${payload.outbox?.oldestPendingAgeSeconds ?? 0}`,
    `Risk critical markets: ${payload.risk?.criticalMarkets ?? 0}`,
    `Fraud blocked 24h: ${payload.risk?.fraudBlocked24h ?? 0}`,
  ].join("\n")
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const slackWebhook = process.env.ALERT_SLACK_WEBHOOK_URL
  if (!slackWebhook) {
    return NextResponse.json({ error: "ALERT_SLACK_WEBHOOK_URL is not configured." }, { status: 500 })
  }

  let payload: RelayPayload
  try {
    payload = (await request.json()) as RelayPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  try {
    const text = formatSlackMessage(payload)
    const response = await fetch(slackWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Slack webhook returned ${response.status}.` }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown relay error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
