import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getLivePool, getAllMarketOdds } from "@/lib/market-betting"
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
        // Fetch all market pools
        const allOdds = await getAllMarketOdds()

        // Fetch recent flagged bets (last 24h)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
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

        // Build per-market risk report
        const marketReports = await Promise.all(
            markets.markets.map(async (market) => {
                const pool = await getLivePool(market.id)
                const liability = calculateMaxLiability(pool, 500)
                const imbalance = calculatePoolImbalance(pool)
                const oddsSnapshot = allOdds.find((s) => s.marketId === market.id)

                const liabilityRatio = liability / RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS
                const betCap = getMarketBetCap(market.id)

                // Determine alert level
                let alertLevel: "OK" | "WARN" | "CRITICAL" = "OK"
                if (liabilityRatio >= 0.9 || imbalance >= 0.8) alertLevel = "CRITICAL"
                else if (liabilityRatio >= 0.6 || imbalance >= 0.6) alertLevel = "WARN"

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
                }
            })
        )

        // Platform-wide summary
        const totalLiability = marketReports.reduce((s, m) => s + m.liability.currentCents, 0)
        const totalPool = marketReports.reduce((s, m) => s + m.pool.totalCents, 0)
        const criticalMarkets = marketReports.filter((m) => m.alertLevel === "CRITICAL").length
        const warnMarkets = marketReports.filter((m) => m.alertLevel === "WARN").length

        return NextResponse.json({
            success: true,
            generatedAt: new Date().toISOString(),
            platformSummary: {
                totalLiabilityKES: (totalLiability / 100).toFixed(2),
                maxLiabilityKES: (RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS / 100).toFixed(2),
                utilisationPct: parseFloat(((totalLiability / RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS) * 100).toFixed(1)),
                totalPoolKES: (totalPool / 100).toFixed(2),
                criticalMarkets,
                warnMarkets,
                healthStatus: criticalMarkets > 0 ? "CRITICAL" : warnMarkets > 0 ? "WARN" : "HEALTHY",
            },
            markets: marketReports,
            recentFlaggedBets: flaggedBets,
        })
    } catch (err) {
        console.error("[RISK_REPORT]", err)
        return NextResponse.json({ error: "Failed to generate risk report." }, { status: 500 })
    }
}
