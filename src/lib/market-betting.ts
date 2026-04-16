import { db } from "@/lib/db"
import { LedgerEntryType, Prisma } from "@prisma/client"
import { enqueueSettlementOutboxEventTx } from "@/lib/reliability"
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
    type RiskAssessment,
} from "@/lib/risk-engine"
import {
    assessBetFraud,
    formatFraudMessage,
} from "@/lib/fraud-engine"
import {
    deriveFraudCooldown,
    getActiveCooldown,
    getMaxCooldownWindowMinutes,
} from "@/lib/fraud-enforcement"
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
    fraudFlags?: Array<{ code: string; message: string; severity: string }>
    maxAllowedStakeCents?: number
    retryAfterSeconds?: number
    cooldownEndsAt?: string
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

export interface ResolvedMarketSummary {
    marketId: string
    winningOutcome: string
    status: "RESOLVED" | "CANCELLED"
    totalWinners: number
    totalLosers: number
    totalRefundedBets: number
    totalRefundedCents: number
    houseRevenueCents: number
    totalPayoutCents: number
}

type TxClient = Prisma.TransactionClient

async function creditWalletInTx(
    tx: TxClient,
    userId: string,
    amountCents: number,
    entryType: LedgerEntryType,
    description: string,
    transactionId?: string
): Promise<{ newBalance: number; ledgerEntryId: string }> {
    const safeAmount = Math.trunc(amountCents)
    if (safeAmount <= 0) {
        throw new Error(`Credit amount must be positive. Got: ${safeAmount}`)
    }

    const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
    })

    await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: safeAmount } },
    })

    const updatedWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { balance: true },
    })
    const newBalance = updatedWallet?.balance ?? 0

    const ledger = await tx.ledgerEntry.create({
        data: {
            userId,
            walletId: wallet.id,
            transactionId,
            entryType,
            amount: safeAmount,
            balanceAfter: newBalance,
            description,
        },
    })

    return { newBalance, ledgerEntryId: ledger.id }
}

async function debitWalletInTx(
    tx: TxClient,
    userId: string,
    amountCents: number,
    entryType: LedgerEntryType,
    description: string,
    transactionId?: string
): Promise<{ newBalance: number; ledgerEntryId: string }> {
    const safeAmount = Math.trunc(amountCents)
    if (safeAmount <= 0) {
        throw new Error(`Debit amount must be positive. Got: ${safeAmount}`)
    }

    const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
    })

    const debitResult = await tx.wallet.updateMany({
        where: {
            id: wallet.id,
            balance: { gte: safeAmount },
        },
        data: {
            balance: { decrement: safeAmount },
        },
    })

    if (debitResult.count === 0) {
        const latest = await tx.wallet.findUnique({
            where: { id: wallet.id },
            select: { balance: true },
        })
        throw new Error(`Insufficient funds. Balance: ${latest?.balance ?? 0}, Requested: ${safeAmount}`)
    }

    const updatedWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { balance: true },
    })
    const newBalance = updatedWallet?.balance ?? 0

    const ledger = await tx.ledgerEntry.create({
        data: {
            userId,
            walletId: wallet.id,
            transactionId,
            entryType,
            amount: safeAmount,
            balanceAfter: newBalance,
            description,
        },
    })

    return { newBalance, ledgerEntryId: ledger.id }
}

export async function getMarketSettlementSummary(
    marketId: string
): Promise<ResolvedMarketSummary | null> {
    const poolRows = await db.marketPool.findMany({
        where: { marketId },
        select: {
            status: true,
            winningOutcome: true,
            totalStakeCents: true,
        },
    })

    if (poolRows.length === 0) {
        return null
    }

    const status = poolRows[0].status
    if (status !== "RESOLVED" && status !== "CANCELLED") {
        return null
    }

    const bets = await db.marketBet.findMany({
        where: { marketId },
        select: {
            status: true,
            actualReturnCents: true,
        },
    })

    const totalWinners = bets.filter((b) => b.status === "WON").length
    const totalLosers = bets.filter((b) => b.status === "LOST").length
    const totalRefundedBets = bets.filter((b) => b.status === "REFUNDED").length
    const totalRefundedCents = bets.reduce((sum, bet) => {
        return bet.status === "REFUNDED" ? sum + (bet.actualReturnCents ?? 0) : sum
    }, 0)
    const totalPayoutCents = bets.reduce((sum, bet) => {
        return bet.status === "WON" ? sum + (bet.actualReturnCents ?? 0) : sum
    }, 0)

    const totalPoolCents = poolRows.reduce((sum, row) => sum + row.totalStakeCents, 0)
    const houseRevenueCents =
        status === "RESOLVED" ? Math.max(0, totalPoolCents - totalPayoutCents) : 0

    return {
        marketId,
        winningOutcome: poolRows[0].winningOutcome ?? "",
        status,
        totalWinners,
        totalLosers,
        totalRefundedBets,
        totalRefundedCents,
        houseRevenueCents,
        totalPayoutCents,
    }
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
    const dbNowRows = await db.$queryRaw<{ now: Date }[]>(Prisma.sql`SELECT NOW() AS now`)
    const dbNow = dbNowRows[0]?.now ?? new Date()

    // 1. Validate market exists in static config
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) {
        return { success: false, error: `Market "${marketId}" not found.` }
    }

    // Phase 4.1: enforce any active fraud cooldown lockout before additional checks.
    const latestCooldown = await db.auditLog.findFirst({
        where: {
            userId,
            action: "MARKET_BET_COOLDOWN_APPLIED",
        },
        orderBy: { createdAt: "desc" },
        select: {
            metadata: true,
        },
    })

    const cooldownMetadata = latestCooldown?.metadata as { expiresAt?: string } | null
    const cooldownExpiresRaw = cooldownMetadata?.expiresAt
    if (cooldownExpiresRaw) {
        const activeCooldown = getActiveCooldown(new Date(cooldownExpiresRaw), dbNow)
        if (activeCooldown) {
            return {
                success: false,
                error: "Betting is temporarily locked due to repeated suspicious attempts. Please try again after cooldown.",
                retryAfterSeconds: activeCooldown.retryAfterSeconds,
                cooldownEndsAt: activeCooldown.expiresAt.toISOString(),
            }
        }
    }

    const validOutcomes = staticMarket.options.map((o) => o.name)

    // 2. Check if market pool is open (DB check)
    const existingPool = await db.marketPool.findFirst({
        where: { marketId },
        orderBy: { updatedAt: "desc" },
        select: { status: true, closesAt: true, houseMarginBps: true },
    })

    // If no pool exists yet, the market is technically open — it will be created
    const marketStatus = existingPool?.status ?? "OPEN"
    const closesAt = existingPool?.closesAt ?? new Date(dbNow.getTime() + 30 * 24 * 60 * 60 * 1000)
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

    // 4c. Phase 4: Fraud behavior assessment (velocity + pattern checks)
    const twoMinAgo = new Date(dbNow.getTime() - 2 * 60 * 1000)
    const fiveMinAgo = new Date(dbNow.getTime() - 5 * 60 * 1000)
    const fifteenMinAgo = new Date(dbNow.getTime() - 15 * 60 * 1000)

    const recentBets = await db.marketBet.findMany({
        where: {
            userId,
            placedAt: { gte: fifteenMinAgo },
        },
        select: {
            marketId: true,
            stakeCents: true,
            placedAt: true,
        },
    })

    const betsLast2Min = recentBets.filter((bet) => bet.placedAt >= twoMinAgo).length
    const betsLast5Min = recentBets.filter((bet) => bet.placedAt >= fiveMinAgo).length
    const betsLast15Min = recentBets.length
    const sameMarketBetsLast2Min = recentBets.filter(
        (bet) => bet.marketId === marketId && bet.placedAt >= twoMinAgo
    ).length
    const identicalStakeCountLast15Min = recentBets.filter(
        (bet) => bet.stakeCents === stakeCents
    ).length
    const stakeLast5MinCents = recentBets
        .filter((bet) => bet.placedAt >= fiveMinAgo)
        .reduce((sum, bet) => sum + bet.stakeCents, 0)

    const fraudAssessment = assessBetFraud({
        userId,
        marketId,
        outcome,
        stakeCents,
        betsLast2Min,
        betsLast5Min,
        betsLast15Min,
        sameMarketBetsLast2Min,
        identicalStakeCountLast15Min,
        stakeLast5MinCents,
    })

    if (fraudAssessment.level === "BLOCKED") {
        const blockedLog = await db.auditLog.create({
            data: {
                userId,
                action: "MARKET_BET_FRAUD_BLOCKED",
                metadata: JSON.parse(JSON.stringify({
                    marketId,
                    outcome,
                    stakeCents,
                    fraudScore: fraudAssessment.score,
                    fraudFlags: fraudAssessment.flags,
                    velocity: {
                        betsLast2Min,
                        betsLast5Min,
                        betsLast15Min,
                        sameMarketBetsLast2Min,
                        identicalStakeCountLast15Min,
                        stakeLast5MinCents,
                    },
                })),
            },
        }).catch(() => {
            return null
        })

        let retryAfterSeconds: number | undefined
        let cooldownEndsAt: string | undefined

        const maxWindowMinutes = getMaxCooldownWindowMinutes()
        const since = new Date(dbNow.getTime() - maxWindowMinutes * 60 * 1000)
        const recentBlocks = await db.auditLog.findMany({
            where: {
                userId,
                action: "MARKET_BET_FRAUD_BLOCKED",
                createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        }).catch(() => [])

        const cooldownPolicy = deriveFraudCooldown(recentBlocks.map((row) => row.createdAt))
        if (cooldownPolicy) {
            const expiresAt = new Date(dbNow.getTime() + cooldownPolicy.cooldownMinutes * 60 * 1000)
            const activeCooldown = getActiveCooldown(expiresAt, dbNow)
            retryAfterSeconds = activeCooldown?.retryAfterSeconds
            cooldownEndsAt = expiresAt.toISOString()

            await db.auditLog.create({
                data: {
                    userId,
                    action: "MARKET_BET_COOLDOWN_APPLIED",
                    metadata: JSON.parse(JSON.stringify({
                        marketId,
                        outcome,
                        triggerLogId: blockedLog?.id,
                        blockedAttemptsInWindow: cooldownPolicy.blockedAttempts,
                        windowMinutes: cooldownPolicy.windowMinutes,
                        cooldownMinutes: cooldownPolicy.cooldownMinutes,
                        expiresAt: cooldownEndsAt,
                    })),
                },
            }).catch(() => {
                // Cooldown telemetry is best-effort; block decision remains enforced.
            })
        }

        const msg = formatFraudMessage(fraudAssessment)
        return {
            success: false,
            error: msg ?? "Bet blocked by fraud controls. Please wait and try again.",
            riskFlags: fraudAssessment.flags,
            fraudFlags: fraudAssessment.flags,
            retryAfterSeconds,
            cooldownEndsAt,
        }
    }

    // 5. Debit wallet + upsert MarketPool + create MarketBet atomically
    type PlacementTxResult =
        | { kind: "placed"; betId: string; oddsAtPlacement: number; estimatedReturnCents: number }
        | { kind: "risk-blocked"; assessment: RiskAssessment }

    try {
        const result = await db.$transaction<PlacementTxResult>(async (tx) => {
            // Lock all existing pool rows for this market so concurrent transactions cannot
            // race past exposure checks based on stale snapshots.
            await tx.$queryRaw(
                Prisma.sql`SELECT id FROM "MarketPool" WHERE "marketId" = ${marketId} FOR UPDATE`
            )

            const txPoolRows = await tx.marketPool.findMany({
                where: { marketId },
                select: { outcome: true, totalStakeCents: true },
            })

            const txCurrentPool: OutcomePools = {}
            for (const opt of staticMarket.options) {
                txCurrentPool[opt.name] = 0
            }
            for (const row of txPoolRows) {
                txCurrentPool[row.outcome] = row.totalStakeCents
            }

            const txExistingBetAgg = await tx.marketBet.aggregate({
                where: { userId, marketId, outcome, status: "PENDING" },
                _sum: { stakeCents: true },
            })
            const txUserExistingStakeOnOutcome = txExistingBetAgg._sum.stakeCents ?? 0

            const txRiskAssessment = assessBetRisk({
                userId,
                marketId,
                outcome,
                stakeCents,
                currentPools: txCurrentPool,
                userExistingStakeOnOutcome: txUserExistingStakeOnOutcome,
                houseMarginBps,
                marketClosesAt: closesAt,
            })

            if (txRiskAssessment.level === "BLOCKED") {
                return {
                    kind: "risk-blocked",
                    assessment: txRiskAssessment,
                }
            }

            const { estimatedReturn, currentOdds } = estimatePotentialPayout(
                stakeCents,
                txCurrentPool,
                outcome,
                houseMarginBps
            )

            const debitResult = await debitWalletInTx(
                tx,
                userId,
                stakeCents,
                "DEBIT",
                `Market bet: ${staticMarket.title} → ${outcome}`
            )

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
                        riskLevel: txRiskAssessment.level,
                        riskFlags: txRiskAssessment.flags.map((f) => f.code),
                        fraudLevel: fraudAssessment.level,
                        fraudScore: fraudAssessment.score,
                        fraudFlags: fraudAssessment.flags.map((f) => f.code),
                    },
                },
            })

            // Log separately if FLAGGED (for admin review queue)
            if (txRiskAssessment.level === "FLAGGED") {
                await tx.auditLog.create({
                    data: {
                        userId,
                        action: "MARKET_BET_RISK_FLAGGED",
                        metadata: JSON.parse(JSON.stringify({
                            marketId,
                            outcome,
                            stakeCents,
                            flags: txRiskAssessment.flags,
                            imbalanceScore: txRiskAssessment.imbalanceScore,
                            projectedLiabilityCents: txRiskAssessment.projectedLiabilityCents,
                        })),
                    },
                })
            }

            if (fraudAssessment.level === "FLAGGED") {
                await tx.auditLog.create({
                    data: {
                        userId,
                        action: "MARKET_BET_FRAUD_FLAGGED",
                        metadata: JSON.parse(JSON.stringify({
                            marketId,
                            outcome,
                            stakeCents,
                            fraudScore: fraudAssessment.score,
                            flags: fraudAssessment.flags,
                            velocity: {
                                betsLast2Min,
                                betsLast5Min,
                                betsLast15Min,
                                sameMarketBetsLast2Min,
                                identicalStakeCountLast15Min,
                                stakeLast5MinCents,
                            },
                        })),
                    },
                })
            }

            return {
                kind: "placed",
                betId: bet.id,
                oddsAtPlacement: currentOdds,
                estimatedReturnCents: estimatedReturn,
            }
        })

        if (result.kind === "risk-blocked") {
            const msg = formatRiskMessage(result.assessment)
            return {
                success: false,
                error: msg ?? "Bet blocked by risk engine. Please reduce your stake.",
                riskFlags: result.assessment.flags,
                maxAllowedStakeCents: result.assessment.maxAllowedStakeCents,
            }
        }

        return {
            success: true,
            betId: result.betId,
            oddsAtPlacement: result.oddsAtPlacement,
            estimatedReturnCents: result.estimatedReturnCents,
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return { success: false, error: `Bet placement failed: ${message}` }
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
    resolvedByAdminId: string,
    settlementToken?: string
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

    // 2. Fetch all pending bets
    const allBets = await db.marketBet.findMany({
        where: { marketId, status: "PENDING" },
        select: { id: true, userId: true, outcome: true, stakeCents: true },
    })

    let totalWinners = 0
    let totalLosers = 0
    let totalPayoutCents = 0

    // 4. Process each bet
    const payoutResults: Array<{ userId: string; betId: string; payout: PayoutResult }> = []
    const payoutByBetId = new Map<string, PayoutResult>()

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
            payoutByBetId.set(bet.id, payout)
            totalWinners++
            totalPayoutCents += payout.totalReturnCents
        } else {
            totalLosers++
        }
    }

    // 4. Apply full settlement atomically in one transaction
    await db.$transaction(async (tx) => {
        await tx.marketPool.updateMany({
            where: { marketId },
            data: { status: "RESOLVED", resolvedAt: new Date(), winningOutcome },
        })

        // Settle all bets
        for (const bet of allBets) {
            const isWinner = bet.outcome === winningOutcome
            await tx.marketBet.update({
                where: { id: bet.id },
                data: {
                    status: isWinner ? "WON" : "LOST",
                    settledAt: new Date(),
                    actualReturnCents: isWinner
                        ? payoutByBetId.get(bet.id)?.totalReturnCents ?? 0
                        : 0,
                },
            })
        }

        for (const { userId, betId, payout } of payoutResults) {
            await creditWalletInTx(
                tx,
                userId,
                payout.totalReturnCents,
                "CREDIT",
                `Market win: ${staticMarket.title} → ${winningOutcome} (${payout.oddsApplied}x odds)`
            )

            await tx.auditLog.create({
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

        // Write resolution audit log
        await tx.auditLog.create({
            data: {
                userId: resolvedByAdminId,
                action: "MARKET_RESOLVED",
                metadata: {
                    marketId,
                    winningOutcome,
                    settlementToken,
                    totalWinners,
                    totalLosers,
                    totalPool,
                    houseRevenueCents,
                    totalPayoutCents,
                },
            },
        })

        await enqueueSettlementOutboxEventTx(tx, {
            eventKey: `market:${marketId}:resolved:${winningOutcome}`,
            eventType: "MARKET_RESOLVED",
            aggregateType: "MARKET",
            aggregateId: marketId,
            payload: {
                marketId,
                winningOutcome,
                settlementToken,
                totalWinners,
                totalLosers,
                totalPoolCents: totalPool,
                houseRevenueCents,
                totalPayoutCents,
                occurredAt: new Date().toISOString(),
            },
        })
    })

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
    cancelledByAdminId: string,
    settlementToken?: string
): Promise<{ refunded: number; totalRefundedCents: number }> {
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) throw new Error(`Market "${marketId}" not found.`)

    const pendingBets = await db.marketBet.findMany({
        where: { marketId, status: "PENDING" },
        select: { id: true, userId: true, stakeCents: true },
    })

    const totalRefundedCents = pendingBets.reduce((sum, bet) => sum + bet.stakeCents, 0)

    await db.$transaction(async (tx) => {
        await tx.marketPool.updateMany({
            where: { marketId },
            data: { status: "CANCELLED" },
        })

        for (const bet of pendingBets) {
            await tx.marketBet.update({
                where: { id: bet.id },
                data: { status: "REFUNDED", settledAt: new Date(), actualReturnCents: bet.stakeCents },
            })

            await creditWalletInTx(
                tx,
                bet.userId,
                bet.stakeCents,
                "CREDIT",
                `Market cancelled refund: ${staticMarket.title}`
            )
        }

        await tx.auditLog.create({
            data: {
                userId: cancelledByAdminId,
                action: "MARKET_CANCELLED",
                metadata: {
                    marketId,
                    refunded: pendingBets.length,
                    totalRefundedCents,
                    settlementToken,
                },
            },
        })

        await enqueueSettlementOutboxEventTx(tx, {
            eventKey: `market:${marketId}:cancelled`,
            eventType: "MARKET_CANCELLED",
            aggregateType: "MARKET",
            aggregateId: marketId,
            payload: {
                marketId,
                settlementToken,
                refundedBets: pendingBets.length,
                totalRefundedCents,
                occurredAt: new Date().toISOString(),
            },
        })
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
