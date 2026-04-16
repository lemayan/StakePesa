// ──────────────────────────────────────────────────────────────────────────────
// STAKEPESA PARI-MUTUEL ODDS ENGINE  (Phase 1)
// ──────────────────────────────────────────────────────────────────────────────
//
// ALGORITHM:
//   The pari-mutuel model calculates payouts from the *actual pool* of stakes,
//   not from fixed bookmaker odds. This means:
//
//   1. All stakes on every outcome go into a shared "total pool".
//   2. The platform takes its margin FIRST (house edge).
//   3. The remaining prize pool is split proportionally among winners.
//
// KEY FORMULAS:
//   prize_pool          = total_pool × (1 − house_margin)
//   decimal_odds[i]     = prize_pool / stakes[i]         (if stakes[i] > 0)
//   payout_for_winner   = user_stake × decimal_odds[winning_outcome]
//   house_revenue       = total_pool × house_margin
//
// WHY THIS IS CORRECT FOR STAKEPESA:
//   ✅ Platform is always profitable regardless of outcome.
//   ✅ Odds reflect real market sentiment (crowd wisdom).
//   ✅ Works perfectly with M-Pesa KES deposits.
//   ✅ Easy to audit — every number is traceable.
//   ✅ Scales naturally as more users join.
//
// UNITS: All monetary values are in KES cents (100 cents = KES 1)
//        unless explicitly stated otherwise in the function signature.
// ──────────────────────────────────────────────────────────────────────────────

// ── Constants ────────────────────────────────────────────────────────────────

/** Default house margin: 5% of total pool (500 basis points). */
export const DEFAULT_HOUSE_MARGIN_BPS = 500

/** Minimum bet in KES cents (KES 10). */
export const MIN_BET_CENTS = 1_000

/** Maximum bet in KES cents (KES 100,000). */
export const MAX_BET_CENTS = 10_000_000

/** Minimum pool depth to display "live" odds (avoid misleading 1-person pools). */
export const MIN_POOL_DEPTH_CENTS = 1_000

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A snapshot of all stakes per outcome in a market.
 * Keys are outcome names (e.g. "Arsenal", "YES", "William Ruto").
 * Values are total stakes in KES cents.
 */
export type OutcomePools = Record<string, number>

/** Computed odds & metadata for a single outcome. */
export interface OutcomeOdds {
    /** Outcome name as used in markets.json */
    outcome: string
    /** Total KES cents staked on this outcome */
    poolCents: number
    /** Pool as percentage of total (0–100 with 2 dp) */
    poolPercentage: number
    /**
     * Decimal odds for this outcome.
     * A bet of X KES returns X × decimalOdds KES (including stake).
     * If no one has bet yet, returns a fair estimate based on equal splits.
     */
    decimalOdds: number
    /**
     * Implied probability of this outcome winning, taking house margin into account.
     * This is what the current money pool says (not the market's initial probability).
     */
    impliedProbability: number
    /**
     * Net profit multiplier. If decimalOdds = 3.50, netMultiplier = 2.50.
     * User stakes KES 100 → profits KES 250 → receives KES 350 total.
     */
    netMultiplier: number
    /** True if this outcome has at least MIN_BET_CENTS staked */
    hasAction: boolean
}

/** Full odds snapshot for a market. */
export interface MarketOddsSnapshot {
    marketId: string
    /** Total stakes across all outcomes, in KES cents */
    totalPoolCents: number
    /** Prize pool after deducting house margin */
    prizePoolCents: number
    /** House revenue from this pool */
    houseRevenueCents: number
    /** House margin in basis points (e.g. 500 = 5%) */
    houseMarginBps: number
    /** Per-outcome odds */
    outcomes: OutcomeOdds[]
    /** ISO timestamp of when this snapshot was computed */
    computedAt: string
    /** True if pool has enough depth for meaningful odds */
    hasLiveOdds: boolean
}

/** Result of a payout calculation for a winning bet. */
export interface PayoutResult {
    /** User's original stake in KES cents */
    stakeCents: number
    /** Total return to user (stake + profit) in KES cents */
    totalReturnCents: number
    /** Net profit (return − stake) in KES cents */
    profitCents: number
    /** The decimal odds that applied at resolution time */
    oddsApplied: number
    /** House margin that was deducted (KES cents) */
    houseFeeCents: number
}

// ── Core Engine Functions ─────────────────────────────────────────────────────

/**
 * Converts basis points to a decimal fraction.
 * @example bpsToFraction(500) → 0.05  (5%)
 */
export function bpsToFraction(bps: number): number {
    return bps / 10_000
}

/**
 * Converts a decimal fraction to basis points.
 * @example fractionToBps(0.05) → 500
 */
export function fractionToBps(fraction: number): number {
    return Math.round(fraction * 10_000)
}

/**
 * Calculates the total pool size from all outcome stakes.
 */
export function calculateTotalPool(pools: OutcomePools): number {
    return Object.values(pools).reduce((sum, cents) => sum + cents, 0)
}

/**
 * Calculates the prize pool available for winners after the house edge.
 *
 * @param totalPoolCents - Total stakes in KES cents
 * @param houseMarginBps - House margin in basis points (default 500 = 5%)
 * @returns Prize pool in KES cents (truncated to whole cents)
 */
export function calculatePrizePool(
    totalPoolCents: number,
    houseMarginBps: number = DEFAULT_HOUSE_MARGIN_BPS
): number {
    const margin = bpsToFraction(houseMarginBps)
    return Math.trunc(totalPoolCents * (1 - margin))
}

/**
 * Calculates the platform's revenue from a pool.
 *
 * @param totalPoolCents - Total stakes in KES cents
 * @param houseMarginBps - House margin in basis points
 * @returns House revenue in KES cents (truncated)
 */
export function calculateHouseRevenue(
    totalPoolCents: number,
    houseMarginBps: number = DEFAULT_HOUSE_MARGIN_BPS
): number {
    const margin = bpsToFraction(houseMarginBps)
    return Math.trunc(totalPoolCents * margin)
}

/**
 * Calculates the decimal odds for a specific outcome.
 *
 * Formula: prize_pool / outcome_pool
 *
 * @param outcomePoolCents - Stakes on this specific outcome
 * @param prizePoolCents - Total prize pool (after house margin)
 * @param outcomeCount - Number of possible outcomes (used for fair fallback)
 * @returns Decimal odds (e.g. 3.50 means KES 100 bet returns KES 350)
 */
export function calculateDecimalOdds(
    outcomePoolCents: number,
    prizePoolCents: number,
    outcomeCount: number = 2
): number {
    // No bets on this outcome — return a flat "fair" estimate
    if (outcomePoolCents <= 0) {
        // Fair odds = prize_pool / equal_share => prize_pool / (prize_pool / outcomeCount)
        return parseFloat(outcomeCount.toFixed(2))
    }

    const odds = prizePoolCents / outcomePoolCents
    // Round to 2 decimal places (standard bookmaker precision)
    return parseFloat(odds.toFixed(2))
}

/**
 * Calculates the implied probability of an outcome given its decimal odds.
 *
 * Formula: implied_prob = 1 / decimal_odds
 *
 * Note: Sum of implied probabilities across all outcomes > 100% — the overround
 * is the bookmaker's margin. For pari-mutuel, we normalize per pool.
 */
export function calculateImpliedProbability(
    outcomePoolCents: number,
    totalPoolCents: number
): number {
    if (totalPoolCents <= 0) return 0
    return parseFloat((outcomePoolCents / totalPoolCents).toFixed(4))
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAIN ENGINE: calculateMarketOdds
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Given the current pool state for a market, calculates:
 *   - Decimal odds for every outcome
 *   - Implied probabilities
 *   - House revenue
 *   - Prize pool
 *
 * This is the function you call to display odds to users on the frontend.
 *
 * @param marketId - Unique market identifier (from markets.json)
 * @param pools - Current stakes per outcome in KES cents
 * @param houseMarginBps - Platform margin in bps (default 500 = 5%)
 * @returns Full odds snapshot
 *
 * @example
 * const snapshot = calculateMarketOdds("epl_winner", {
 *   Arsenal: 50000,       // KES 500 staked
 *   "Manchester City": 30000, // KES 300 staked
 *   Liverpool: 20000,     // KES 200 staked
 *   Other: 0,
 * })
 * // Arsenal decimal odds ≈ 1.90 (most money on them, lowest return)
 * // Manchester City odds ≈ 3.17
 * // Liverpool odds ≈ 4.75
 */
export function calculateMarketOdds(
    marketId: string,
    pools: OutcomePools,
    houseMarginBps: number = DEFAULT_HOUSE_MARGIN_BPS
): MarketOddsSnapshot {
    const totalPoolCents = calculateTotalPool(pools)
    const prizePoolCents = calculatePrizePool(totalPoolCents, houseMarginBps)
    const houseRevenueCents = calculateHouseRevenue(totalPoolCents, houseMarginBps)
    const outcomes = Object.keys(pools)

    const outcomeOdds: OutcomeOdds[] = outcomes.map((outcome) => {
        const poolCents = pools[outcome] ?? 0
        const poolPercentage =
            totalPoolCents > 0
                ? parseFloat(((poolCents / totalPoolCents) * 100).toFixed(2))
                : parseFloat((100 / outcomes.length).toFixed(2))

        const decimalOdds = calculateDecimalOdds(poolCents, prizePoolCents, outcomes.length)
        const impliedProbability = calculateImpliedProbability(poolCents, totalPoolCents)
        const netMultiplier = parseFloat((decimalOdds - 1).toFixed(2))

        return {
            outcome,
            poolCents,
            poolPercentage,
            decimalOdds,
            impliedProbability,
            netMultiplier,
            hasAction: poolCents >= MIN_POOL_DEPTH_CENTS,
        }
    })

    // Sort by pool size descending (most popular first)
    outcomeOdds.sort((a, b) => b.poolCents - a.poolCents)

    return {
        marketId,
        totalPoolCents,
        prizePoolCents,
        houseRevenueCents,
        houseMarginBps,
        outcomes: outcomeOdds,
        computedAt: new Date().toISOString(),
        hasLiveOdds: totalPoolCents >= MIN_POOL_DEPTH_CENTS,
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PAYOUT CALCULATOR: calculateWinnerPayout
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Calculates the exact payout for a winner in a resolved market.
 *
 * This is called at RESOLUTION TIME (after the market closes), not when
 * placing a bet. Odds at resolution reflect the final pool distribution.
 *
 * @param userStakeCents - The user's original stake in KES cents
 * @param winningOutcomePoolCents - Total stakes on the winning outcome
 * @param totalPoolCents - Grand total of all stakes in the market
 * @param houseMarginBps - House margin in basis points
 * @returns Precise payout breakdown
 *
 * @example
 * // User staked KES 500 on Arsenal (winning)
 * // Arsenal pool: KES 500 total
 * // Total pool: KES 1000
 * // House margin: 5%
 * const payout = calculateWinnerPayout(50000, 50000, 100000, 500)
 * // → totalReturnCents: 95000 (KES 950), profitCents: 45000 (KES 450)
 */
export function calculateWinnerPayout(
    userStakeCents: number,
    winningOutcomePoolCents: number,
    totalPoolCents: number,
    houseMarginBps: number = DEFAULT_HOUSE_MARGIN_BPS
): PayoutResult {
    if (winningOutcomePoolCents <= 0) {
        throw new Error("Winning outcome pool cannot be zero — no bets to pay out.")
    }
    if (userStakeCents <= 0) {
        throw new Error("User stake must be positive.")
    }
    if (userStakeCents > winningOutcomePoolCents) {
        throw new Error("User stake cannot exceed total winning outcome pool.")
    }

    const prizePoolCents = calculatePrizePool(totalPoolCents, houseMarginBps)
    const houseFeeCents = calculateHouseRevenue(totalPoolCents, houseMarginBps)

    // Payout = (user_stake / winning_pool) × prize_pool
    // This is proportional — bigger stake = bigger slice of the prize pool
    const totalReturnCents = Math.trunc(
        (userStakeCents / winningOutcomePoolCents) * prizePoolCents
    )
    const profitCents = totalReturnCents - userStakeCents
    const oddsApplied = parseFloat((totalReturnCents / userStakeCents).toFixed(2))

    return {
        stakeCents: userStakeCents,
        totalReturnCents,
        profitCents,
        oddsApplied,
        houseFeeCents,
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BET VALIDATOR: validateBet
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Validates a bet placement before it touches the DB or wallet.
 *
 * @param stakeCents - Proposed bet stake in KES cents
 * @param walletBalanceCents - User's available wallet balance
 * @param outcome - Proposed outcome name
 * @param validOutcomes - All valid outcome names for this market
 * @param marketClosesAt - Market close datetime (bets blocked after this)
 * @returns Validation result with error message if invalid
 */
export function validateBet(
    stakeCents: number,
    walletBalanceCents: number,
    outcome: string,
    validOutcomes: string[],
    marketClosesAt: Date
): { valid: boolean; error?: string } {
    if (!validOutcomes.includes(outcome)) {
        return {
            valid: false,
            error: `"${outcome}" is not a valid outcome. Valid options: ${validOutcomes.join(", ")}`,
        }
    }

    if (stakeCents < MIN_BET_CENTS) {
        return {
            valid: false,
            error: `Minimum bet is KES ${(MIN_BET_CENTS / 100).toFixed(0)}. You entered KES ${(stakeCents / 100).toFixed(2)}.`,
        }
    }

    if (stakeCents > MAX_BET_CENTS) {
        return {
            valid: false,
            error: `Maximum bet is KES ${(MAX_BET_CENTS / 100).toLocaleString()}. You entered KES ${(stakeCents / 100).toFixed(2)}.`,
        }
    }

    if (walletBalanceCents < stakeCents) {
        return {
            valid: false,
            error: `Insufficient funds. Balance: KES ${(walletBalanceCents / 100).toFixed(2)}, Required: KES ${(stakeCents / 100).toFixed(2)}.`,
        }
    }

    if (new Date() >= marketClosesAt) {
        return {
            valid: false,
            error: "This market is closed. No more bets are being accepted.",
        }
    }

    return { valid: true }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DISPLAY HELPERS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Formats decimal odds as a human-readable multiplier string.
 * @example formatOdds(3.5) → "3.50x"
 */
export function formatOdds(decimalOdds: number): string {
    return `${decimalOdds.toFixed(2)}x`
}

/**
 * Formats a KES cents amount as a KES string.
 * @example formatKES(150000) → "KES 1,500.00"
 */
export function formatKES(cents: number): string {
    return `KES ${(cents / 100).toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

/**
 * Estimates potential payout for a bet BEFORE it is placed.
 * This is for UI display only — NOT the final payout at resolution.
 *
 * The estimate assumes the new stake is added to the pool to show
 * what return the user would get at current odds.
 *
 * @param userStakeCents - The stake the user is considering
 * @param currentPool - Current pool state (before user's bet)
 * @param chosenOutcome - The outcome user wants to bet on
 * @param houseMarginBps - House margin
 */
export function estimatePotentialPayout(
    userStakeCents: number,
    currentPool: OutcomePools,
    chosenOutcome: string,
    houseMarginBps: number = DEFAULT_HOUSE_MARGIN_BPS
): { estimatedReturn: number; estimatedProfit: number; currentOdds: number } {
    // Project pool AFTER this bet is added
    const projectedPool: OutcomePools = {
        ...currentPool,
        [chosenOutcome]: (currentPool[chosenOutcome] ?? 0) + userStakeCents,
    }

    const totalPoolCents = calculateTotalPool(projectedPool)
    const prizePoolCents = calculatePrizePool(totalPoolCents, houseMarginBps)
    const outcomePoolCents = projectedPool[chosenOutcome] ?? 0

    const currentOdds = calculateDecimalOdds(
        outcomePoolCents,
        prizePoolCents,
        Object.keys(currentPool).length
    )

    // Proportional return
    const estimatedReturn = Math.trunc((userStakeCents / outcomePoolCents) * prizePoolCents)
    const estimatedProfit = estimatedReturn - userStakeCents

    return { estimatedReturn, estimatedProfit, currentOdds }
}
