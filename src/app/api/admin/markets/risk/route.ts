import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getAllMarketOdds } from "@/lib/market-betting"
import {
    calculateMaxLiability,
    calculatePoolImbalance,
    describeImbalance,
    RISK_CONFIG,
    getMarketBetCap,
} from "@/lib/risk-engine"
import markets from "@/data/markets.json"

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/markets/risk
//
// Admin-only: returns the live risk exposure report for all open markets.
// Shows liability, imbalance, flagged bets, and suggested alerts.
// ──────────────────────────────────────────────────────────────────────────────

async function requireAdmin(request: Request) {
    const session = await auth()
    if (!session?.user?.id) return null

    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase())
    if (!adminEmails.includes(session.user.email?.toLowerCase() ?? "")) return null

    return session.user
}

export async function GET(request: Request) {
    const admin = await requireAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    try {
        const dbNowRows = await db.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`
        const dbNow = dbNowRows[0]?.now ?? new Date()

        // Fetch all market pools
        const allOdds = await getAllMarketOdds()

        // Fetch recent flagged bets (last 24h)
        const since = new Date(dbNow.getTime() - 24 * 60 * 60 * 1000)
        const flaggedBets = await db.auditLog.findMany({
            where: {
                action: "MARKET_BET_RISK_FLAGGED",
                createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                userId: true,
                metadata: true,
                createdAt: true,
            },
        })

        const fraudEvents = await db.auditLog.findMany({
            where: {
                action: { in: ["MARKET_BET_FRAUD_FLAGGED", "MARKET_BET_FRAUD_BLOCKED"] },
                createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
                id: true,
                userId: true,
                action: true,
                metadata: true,
                createdAt: true,
            },
        })

        const cooldownEvents = await db.auditLog.findMany({
            where: {
                action: "MARKET_BET_COOLDOWN_APPLIED",
                createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
                id: true,
                userId: true,
                metadata: true,
                createdAt: true,
            },
        })

        const fraudByMarket = new Map<string, { flagged: number; blocked: number }>()
        for (const event of fraudEvents) {
            const metadata = event.metadata as { marketId?: string } | null
            const marketId = metadata?.marketId
            if (!marketId) continue

            const current = fraudByMarket.get(marketId) ?? { flagged: 0, blocked: 0 }
            if (event.action === "MARKET_BET_FRAUD_BLOCKED") current.blocked += 1
            if (event.action === "MARKET_BET_FRAUD_FLAGGED") current.flagged += 1
            fraudByMarket.set(marketId, current)
        }

        // Build per-market risk report
        const marketReports = await Promise.all(
            markets.markets.map(async (market) => {
                const oddsSnapshot = allOdds.find((s) => s.marketId === market.id)
                const pool = Object.fromEntries(
                    (oddsSnapshot?.outcomes ?? []).map((o) => [o.outcome, o.poolCents])
                )
                const houseMarginBps = oddsSnapshot?.houseMarginBps ?? 500
                const liability = calculateMaxLiability(pool, houseMarginBps)
                const imbalance = calculatePoolImbalance(pool)

                const liabilityRatio = liability / RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS
                const betCap = getMarketBetCap(market.id)

                // Determine alert level
                let alertLevel: "OK" | "WARN" | "CRITICAL" = "OK"
                if (liabilityRatio >= 0.9 || imbalance >= 0.8) alertLevel = "CRITICAL"
                else if (liabilityRatio >= 0.6 || imbalance >= 0.6) alertLevel = "WARN"

                const fraud = fraudByMarket.get(market.id) ?? { flagged: 0, blocked: 0 }

                return {
                    marketId: market.id,
                    marketTitle: market.title,
                    category: market.category,
                    alertLevel,
                    liability: {
                        currentCents: liability,
                        maxCents: RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS,
                        utilisationPct: parseFloat((liabilityRatio * 100).toFixed(1)),
                    },
                    pool: {
                        totalCents: oddsSnapshot?.totalPoolCents ?? 0,
                        prizePoolCents: oddsSnapshot?.prizePoolCents ?? 0,
                        houseRevenueCents: oddsSnapshot?.houseRevenueCents ?? 0,
                        outcomes: oddsSnapshot?.outcomes.map((o) => ({
                            outcome: o.outcome,
                            stakeCents: o.poolCents,
                            pct: o.poolPercentage,
                            odds: o.decimalOdds,
                        })) ?? [],
                    },
                    imbalance: {
                        score: imbalance,
                        description: describeImbalance(imbalance),
                    },
                    betCap: {
                        marketCapCents: betCap,
                        globalCapCents: 10_000_000,
                        isCustom: betCap !== 10_000_000,
                    },
                    fraud: {
                        flagged24h: fraud.flagged,
                        blocked24h: fraud.blocked,
                        alerts24h: fraud.flagged + fraud.blocked,
                    },
                }
            })
        )

        // Platform-wide summary
        const totalLiability = marketReports.reduce((s, m) => s + m.liability.currentCents, 0)
        const totalPool = marketReports.reduce((s, m) => s + m.pool.totalCents, 0)
        const criticalMarkets = marketReports.filter((m) => m.alertLevel === "CRITICAL").length
        const warnMarkets = marketReports.filter((m) => m.alertLevel === "WARN").length
        const fraudFlagged24h = fraudEvents.filter((event) => event.action === "MARKET_BET_FRAUD_FLAGGED").length
        const fraudBlocked24h = fraudEvents.filter((event) => event.action === "MARKET_BET_FRAUD_BLOCKED").length
        const cooldownApplied24h = cooldownEvents.length
        const activeCooldownUsers = new Set(
            cooldownEvents
                .filter((event) => {
                    const metadata = event.metadata as { expiresAt?: string } | null
                    if (!metadata?.expiresAt) return false
                    return new Date(metadata.expiresAt) > dbNow
                })
                .map((event) => event.userId)
        ).size

        return NextResponse.json({
            success: true,
            generatedAt: dbNow.toISOString(),
            platformSummary: {
                totalLiabilityKES: (totalLiability / 100).toFixed(2),
                maxLiabilityKES: (RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS / 100).toFixed(2),
                utilisationPct: parseFloat(((totalLiability / RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS) * 100).toFixed(1)),
                totalPoolKES: (totalPool / 100).toFixed(2),
                criticalMarkets,
                warnMarkets,
                fraudFlagged24h,
                fraudBlocked24h,
                fraudAlerts24h: fraudFlagged24h + fraudBlocked24h,
                cooldownApplied24h,
                activeCooldownUsers,
                healthStatus: criticalMarkets > 0 ? "CRITICAL" : warnMarkets > 0 ? "WARN" : "HEALTHY",
            },
            markets: marketReports,
            recentFlaggedBets: flaggedBets,
            recentFraudEvents: fraudEvents,
            recentCooldownEvents: cooldownEvents,
        })
    } catch (err) {
        console.error("[RISK_REPORT]", err)
        return NextResponse.json({ error: "Failed to generate risk report." }, { status: 500 })
    }
}
