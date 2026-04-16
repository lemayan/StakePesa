import { db } from "@/lib/db"
import { debitWallet, creditWallet } from "@/lib/wallet"
import {
    calculateMarketOdds,
    calculateWinnerPayout,
    estimatePotentialPayout,
    validateBet,
    type OutcomePools,
    type MarketOddsSnapshot,
    type PayoutResult,
} from "@/lib/odds-engine"
import {
    assessBetRisk,
    formatRiskMessage,
} from "@/lib/risk-engine"
import markets from "@/data/markets.json"

// ──────────────────────────────────────────────────────────────────────────────
// MARKET BETTING SERVICE
//
// Orchestrates the pari-mutuel bet lifecycle:
//   1. Read live pool from DB
//   2. Validate bet via odds engine
//   3. Debit wallet atomically
//   4. Update pool + create bet record in one Prisma $transaction
//   5. At resolution: pay out winners, mark losers, credit wallet
// ──────────────────────────────────────────────────────────────────────────────

// ── Market Resolution Types ───────────────────────────────────────────────────

export interface BetPlacementResult {
    success: boolean
    betId?: string
    oddsAtPlacement?: number
    estimatedReturnCents?: number
    error?: string
    riskFlags?: Array<{ code: string; message: string; severity: string }>
    maxAllowedStakeCents?: number
}

export interface MarketResolutionResult {
    marketId: string
    winningOutcome: string
    totalWinners: number
    totalLosers: number
    totalRefundedBets: number
    houseRevenueCents: number
    totalPayoutCents: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gets the static market definition from markets.json by ID.
 * Returns null if the market doesn't exist in the static config.
 */
export function getStaticMarket(marketId: string) {
    return markets.markets.find((m) => m.id === marketId) ?? null
}

/**
 * Reads the current live pool state from DB for a market.
 * Returns a map of { outcome → totalStakeCents }.
 * Missing outcomes (no bets yet) are initialised to 0.
 */
export async function getLivePool(marketId: string): Promise<OutcomePools> {
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) return {}

    // Initialise all outcomes at 0 so odds engine always sees a complete set
    const pool: OutcomePools = {}
    for (const opt of staticMarket.options) {
        pool[opt.name] = 0
    }

    // Aggregate DB stakes per outcome
    const rows = await db.marketPool.findMany({
        where: { marketId },
        select: { outcome: true, totalStakeCents: true },
    })
    for (const row of rows) {
        pool[row.outcome] = row.totalStakeCents
    }

    return pool
}

/**
 * Returns the current MarketOddsSnapshot for a market.
 * This is what the frontend displays as "live odds".
 *
 * @param marketId - market ID from markets.json
 * @param houseMarginBps - optional override (default 500 = 5%)
 */
export async function getMarketOdds(
    marketId: string,
    houseMarginBps?: number
): Promise<MarketOddsSnapshot | null> {
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) return null

    const pool = await getLivePool(marketId)
    return calculateMarketOdds(marketId, pool, houseMarginBps)
}

/**
 * Returns odds snapshots for all markets at once (for the dashboard).
 */
export async function getAllMarketOdds(): Promise<MarketOddsSnapshot[]> {
    const allPools = await db.marketPool.findMany({
        select: { marketId: true, outcome: true, totalStakeCents: true, houseMarginBps: true },
    })

    // Group by marketId
    const byMarket = new Map<string, { outcome: string; stake: number; houseMarginBps: number }[]>()
    for (const row of allPools) {
        const arr = byMarket.get(row.marketId) ?? []
        arr.push({ outcome: row.outcome, stake: row.totalStakeCents, houseMarginBps: row.houseMarginBps })
        byMarket.set(row.marketId, arr)
    }

    const snapshots: MarketOddsSnapshot[] = []
    for (const market of markets.markets) {
        const rows = byMarket.get(market.id) ?? []

        // Build pool map, default 0 for unseen outcomes
        const pool: OutcomePools = {}
        for (const opt of market.options) {
            pool[opt.name] = 0
        }
        for (const row of rows) {
            pool[row.outcome] = row.stake
        }

        const houseMarginBps = rows[0]?.houseMarginBps ?? 500
        snapshots.push(calculateMarketOdds(market.id, pool, houseMarginBps))
    }

    return snapshots
}

// ── Bet Placement ─────────────────────────────────────────────────────────────

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACE BET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Atomic bet placement flow:
 *  1. Validate market exists & is open
 *  2. Validate bet (amount, outcome, balance) via odds engine
 *  3. Snapshot current odds for display / record-keeping
 *  4. Debit wallet
 *  5. Upsert MarketPool + create MarketBet in one DB transaction
 *  6. Write audit log
 *
 * @param userId - Authenticated user ID
 * @param marketId - Market from markets.json
 * @param outcome - Chosen outcome (must match market options exactly)
 * @param stakeCents - Bet size in KES cents
 * @param walletBalanceCents - Current wallet balance (pre-fetched by caller)
 */
export async function placeBet(
    userId: string,
    marketId: string,
    outcome: string,
    stakeCents: number,
    walletBalanceCents: number
): Promise<BetPlacementResult> {
    // 1. Validate market exists in static config
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) {
        return { success: false, error: `Market "${marketId}" not found.` }
    }

    const validOutcomes = staticMarket.options.map((o) => o.name)

    // 2. Check if market pool is open (DB check)
    const existingPool = await db.marketPool.findFirst({
        where: { marketId, outcome: validOutcomes[0] }, // representative row
        select: { status: true, closesAt: true, houseMarginBps: true },
    })

    // If no pool exists yet, the market is technically open — it will be created
    const marketStatus = existingPool?.status ?? "OPEN"
    const closesAt = existingPool?.closesAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const houseMarginBps = existingPool?.houseMarginBps ?? 500

    if (marketStatus !== "OPEN") {
        return { success: false, error: `Market is ${marketStatus.toLowerCase()}. No more bets accepted.` }
    }

    // 3. Validate bet via odds engine (basic checks)
    const validation = validateBet(stakeCents, walletBalanceCents, outcome, validOutcomes, closesAt)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    // 4. Snapshot current pool (needed for both risk + odds)
    const currentPool = await getLivePool(marketId)

    // 4a. Fetch user's existing stake on this outcome (for concentration check)
    const existingBetAgg = await db.marketBet.aggregate({
        where: { userId, marketId, outcome, status: "PENDING" },
        _sum: { stakeCents: true },
    })
    const userExistingStakeOnOutcome = existingBetAgg._sum.stakeCents ?? 0

    // 4b. Phase 2: Risk & Liability Assessment
    const riskAssessment = assessBetRisk({
        userId,
        marketId,
        outcome,
        stakeCents,
        currentPools: currentPool,
        userExistingStakeOnOutcome,
        houseMarginBps,
        marketClosesAt: closesAt,
    })

    if (riskAssessment.level === "BLOCKED") {
        const msg = formatRiskMessage(riskAssessment)
        return {
            success: false,
            error: msg ?? "Bet blocked by risk engine. Please reduce your stake.",
            riskFlags: riskAssessment.flags,
            maxAllowedStakeCents: riskAssessment.maxAllowedStakeCents,
        }
    }
    const { estimatedReturn, currentOdds } = estimatePotentialPayout(
        stakeCents,
        currentPool,
        outcome,
        houseMarginBps
    )

    // 5. Debit wallet first (outside Prisma tx — uses its own atomic tx)
    let debitResult: { ledgerEntryId: string }
    try {
        debitResult = await debitWallet(
            userId,
            stakeCents,
            undefined,
            "DEBIT",
            `Market bet: ${staticMarket.title} → ${outcome}`
        )
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return { success: false, error: `Wallet debit failed: ${message}` }
    }

    // 6. Upsert MarketPool + create MarketBet atomically
    let betId: string
    try {
        const result = await db.$transaction(async (tx) => {
            // Upsert the pool row for this (marketId, outcome) pair
            const pool = await tx.marketPool.upsert({
                where: { marketId_outcome: { marketId, outcome } },
                update: {
                    totalStakeCents: { increment: stakeCents },
                    betCount: { increment: 1 },
                },
                create: {
                    marketId,
                    outcome,
                    totalStakeCents: stakeCents,
                    betCount: 1,
                    status: "OPEN",
                    closesAt,
                    houseMarginBps,
                },
            })

            // Create the individual bet record
            const bet = await tx.marketBet.create({
                data: {
                    userId,
                    marketId,
                    marketPoolId: pool.id,
                    outcome,
                    stakeCents,
                    oddsAtPlacement: currentOdds,
                    estimatedReturn,
                    status: "PENDING",
                },
            })

            await tx.auditLog.create({
                data: {
                    userId,
                    action: "MARKET_BET_PLACED",
                    metadata: {
                        marketId,
                        outcome,
                        stakeCents,
                        oddsAtPlacement: currentOdds,
                        estimatedReturn,
                        ledgerEntryId: debitResult.ledgerEntryId,
                        riskLevel: riskAssessment.level,
                        riskFlags: riskAssessment.flags.map((f) => f.code),
                    },
                },
            })

            // Log separately if FLAGGED (for admin review queue)
            if (riskAssessment.level === "FLAGGED") {
                await tx.auditLog.create({
                    data: {
                        userId,
                        action: "MARKET_BET_RISK_FLAGGED",
                        metadata: JSON.parse(JSON.stringify({
                            marketId,
                            outcome,
                            stakeCents,
                            flags: riskAssessment.flags,
                            imbalanceScore: riskAssessment.imbalanceScore,
                            projectedLiabilityCents: riskAssessment.projectedLiabilityCents,
                        })),
                    },
                })
            }

            return bet
        })

        betId = result.id
    } catch (err: unknown) {
        // Bet creation failed — refund the wallet debit
        console.error("[MARKET_BET] Bet record creation failed, refunding wallet:", err)
        await creditWallet(
            userId,
            stakeCents,
            undefined,
            "CREDIT",
            `Bet placement refund (failed) — ${staticMarket.title} → ${outcome}`
        )
        return { success: false, error: "Bet placement failed. Your wallet has been refunded." }
    }

    return {
        success: true,
        betId,
        oddsAtPlacement: currentOdds,
        estimatedReturnCents: estimatedReturn,
    }
}

// ── Market Resolution ─────────────────────────────────────────────────────────

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RESOLVE MARKET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Called by an admin once the real-world outcome is known.
 *
 * Flow:
 *  1. Mark all MarketPool rows as RESOLVED + set winningOutcome
 *  2. Fetch all PENDING bets for this market
 *  3. Calculate exact payouts using odds engine
 *  4. Credit winners, mark losers, write audit trail
 *  5. Return resolution summary
 *
 * @param marketId - Market to resolve
 * @param winningOutcome - Exact outcome name that won (must match markets.json)
 * @param resolvedByAdminId - Admin user ID for audit trail
 */
export async function resolveMarket(
    marketId: string,
    winningOutcome: string,
    resolvedByAdminId: string
): Promise<MarketResolutionResult> {
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) {
        throw new Error(`Market "${marketId}" not found in static config.`)
    }

    const validOutcomes = staticMarket.options.map((o) => o.name)
    if (!validOutcomes.includes(winningOutcome)) {
        throw new Error(
            `"${winningOutcome}" is not a valid outcome for market "${marketId}". ` +
            `Valid: ${validOutcomes.join(", ")}`
        )
    }

    // 1. Read the full pool
    const pool = await getLivePool(marketId)
    const houseMarginBps = (await db.marketPool.findFirst({ where: { marketId }, select: { houseMarginBps: true } }))?.houseMarginBps ?? 500
    const odds = calculateMarketOdds(marketId, pool, houseMarginBps)

    const winningOutcomePool = pool[winningOutcome] ?? 0
    const totalPool = odds.totalPoolCents
    const houseRevenueCents = odds.houseRevenueCents

    // 2. Mark pool rows RESOLVED
    await db.marketPool.updateMany({
        where: { marketId },
        data: { status: "RESOLVED", resolvedAt: new Date(), winningOutcome },
    })

    // 3. Fetch all pending bets
    const allBets = await db.marketBet.findMany({
        where: { marketId, status: "PENDING" },
        select: { id: true, userId: true, outcome: true, stakeCents: true },
    })

    let totalWinners = 0
    let totalLosers = 0
    let totalPayoutCents = 0

    // 4. Process each bet
    const payoutResults: Array<{ userId: string; betId: string; payout: PayoutResult }> = []

    for (const bet of allBets) {
        if (bet.outcome === winningOutcome) {
            // Winner — calculate their share of the prize pool
            const payout = calculateWinnerPayout(
                bet.stakeCents,
                winningOutcomePool,
                totalPool,
                houseMarginBps
            )
            payoutResults.push({ userId: bet.userId, betId: bet.id, payout })
            totalWinners++
            totalPayoutCents += payout.totalReturnCents
        } else {
            totalLosers++
        }
    }

    // 5. Apply DB updates in one transaction
    await db.$transaction(async (tx) => {
        // Settle all bets
        for (const bet of allBets) {
            const isWinner = bet.outcome === winningOutcome
            await tx.marketBet.update({
                where: { id: bet.id },
                data: {
                    status: isWinner ? "WON" : "LOST",
                    settledAt: new Date(),
                    actualReturnCents: isWinner
                        ? payoutResults.find((r) => r.betId === bet.id)?.payout.totalReturnCents ?? 0
                        : 0,
                },
            })
        }

        // Write resolution audit log
        await tx.auditLog.create({
            data: {
                userId: resolvedByAdminId,
                action: "MARKET_RESOLVED",
                metadata: {
                    marketId,
                    winningOutcome,
                    totalWinners,
                    totalLosers,
                    totalPool,
                    houseRevenueCents,
                    totalPayoutCents,
                },
            },
        })
    })

    // 6. Credit winners (outside tx — each uses its own atomic wallet tx)
    for (const { userId, betId, payout } of payoutResults) {
        await creditWallet(
            userId,
            payout.totalReturnCents,
            undefined,
            "CREDIT",
            `Market win: ${staticMarket.title} → ${winningOutcome} (${payout.oddsApplied}x odds)`
        )

        await db.auditLog.create({
            data: {
                userId,
                action: "MARKET_BET_WON",
                metadata: {
                    marketId,
                    betId,
                    winningOutcome,
                    stakeCents: payout.stakeCents,
                    totalReturnCents: payout.totalReturnCents,
                    profitCents: payout.profitCents,
                    oddsApplied: payout.oddsApplied,
                },
            },
        })
    }

    return {
        marketId,
        winningOutcome,
        totalWinners,
        totalLosers,
        totalRefundedBets: 0,
        houseRevenueCents,
        totalPayoutCents,
    }
}

/**
 * Cancels a market and refunds all PENDING bets.
 * Used when a match/event is postponed or data is unavailable.
 *
 * @param marketId - Market to cancel
 * @param cancelledByAdminId - Admin user ID for audit trail
 */
export async function cancelMarket(
    marketId: string,
    cancelledByAdminId: string
): Promise<{ refunded: number; totalRefundedCents: number }> {
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) throw new Error(`Market "${marketId}" not found.`)

    // Mark pool as cancelled
    await db.marketPool.updateMany({
        where: { marketId },
        data: { status: "CANCELLED" },
    })

    // Fetch all pending bets
    const pendingBets = await db.marketBet.findMany({
        where: { marketId, status: "PENDING" },
        select: { id: true, userId: true, stakeCents: true },
    })

    let totalRefundedCents = 0

    for (const bet of pendingBets) {
        // Mark bet refunded
        await db.marketBet.update({
            where: { id: bet.id },
            data: { status: "REFUNDED", settledAt: new Date(), actualReturnCents: bet.stakeCents },
        })

        // Refund wallet
        await creditWallet(
            bet.userId,
            bet.stakeCents,
            undefined,
            "CREDIT",
            `Market cancelled refund: ${staticMarket.title}`
        )

        totalRefundedCents += bet.stakeCents
    }

    await db.auditLog.create({
        data: {
            userId: cancelledByAdminId,
            action: "MARKET_CANCELLED",
            metadata: { marketId, refunded: pendingBets.length, totalRefundedCents },
        },
    })

    return { refunded: pendingBets.length, totalRefundedCents }
}

/**
 * Gets a user's betting history with profit/loss tracking.
 */
export async function getUserBettingHistory(userId: string, limit = 20) {
    const bets = await db.marketBet.findMany({
        where: { userId },
        orderBy: { placedAt: "desc" },
        take: limit,
        select: {
            id: true,
            marketId: true,
            outcome: true,
            stakeCents: true,
            oddsAtPlacement: true,
            estimatedReturn: true,
            actualReturnCents: true,
            status: true,
            placedAt: true,
            settledAt: true,
        },
    })

    return bets.map((bet) => {
        const staticMarket = getStaticMarket(bet.marketId)
        const profitCents =
            bet.status === "WON" && bet.actualReturnCents != null
                ? bet.actualReturnCents - bet.stakeCents
                : bet.status === "LOST"
                    ? -bet.stakeCents
                    : 0

        return {
            ...bet,
            marketTitle: staticMarket?.title ?? bet.marketId,
            marketCategory: staticMarket?.category ?? "unknown",
            profitCents,
        }
    })
}
