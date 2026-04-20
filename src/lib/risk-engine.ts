// ──────────────────────────────────────────────────────────────────────────────
// STAKEPESA RISK & LIABILITY ENGINE  (Phase 2)
// ──────────────────────────────────────────────────────────────────────────────
//
// PURPOSE:
//   Protects the platform from catastrophic payout scenarios.
//   Every bet goes through the risk engine BEFORE it touches the wallet.
//
// RISKS MANAGED:
//   1. MAX EXPOSURE — platform can't pay out if one outcome is too dominant.
//   2. POOL IMBALANCE — unbalanced pools erode the prize fund.
//   3. PER-USER CONCENTRATION — one user owning >X% of a pool is risky.
//   4. LATE SURGE DETECTION — big bets near close-time signal insider risk.
//   5. SINGLE-BET SIZE CAPS — per-market maximums beyond the global default.
//
// HOW IT INTEGRATES:
//   Call `assessBetRisk()` in the placeBet() service BEFORE debiting wallet.
//   If risk level is BLOCKED → reject the bet.
//   If risk level is FLAGGED → accept but write a risk audit log.
//   If risk level is CLEAR   → proceed normally.
//
// UNITS: All monetary values in KES cents.
// ──────────────────────────────────────────────────────────────────────────────

import { calculateTotalPool, calculateHouseRevenue, type OutcomePools } from "@/lib/odds-engine"

// ── Configuration ─────────────────────────────────────────────────────────────

/**
 * Platform-wide risk configuration.
 * These are designed to be safe defaults for a new platform.
 * Tighten them as volume grows.
 */
export const RISK_CONFIG = {
    /**
     * Maximum platform liability on a single outcome as a % of total pool.
     * If winning one outcome would cost the platform more than this fraction
     * of the prize pool, the bet that would push it over is BLOCKED.
     *
     * Default 80%: if >80% of the pool is on one outcome, new bets on it are blocked.
     * This prevents the prize pool from being entirely consumed by one outcome.
     */
    MAX_SINGLE_OUTCOME_POOL_FRACTION: 0.80,

    /**
     * Maximum any single user can own of a single outcome pool (fraction).
     * Prevents one whale from monopolising an outcome and making the pool illiquid.
     * Default: 50% (a user can own at most half of any outcome's pool).
     */
    MAX_USER_OUTCOME_OWNERSHIP_FRACTION: 0.50,

    /**
     * Minimum total pool size (KES cents) before concentration checks are enforced.
     * Below this threshold, concentration is meaningless (the first bettor is always
     * 100% of the pool). Seed bets are allowed freely until the pool has real liquidity.
     * Default: KES 1,000 (100,000 cents).
     */
    MIN_POOL_FOR_CONCENTRATION_CHECK: 100_000, // KES 1,000

    /**
     * Net liability cap per market in KES cents.
     * If paying out all winners on the most-staked outcome would exceed this,
     * the platform BLOCKS further bets on that outcome.
     * Default: KES 500,000 (50,000,000 cents).
     *
     * Increase this as the platform grows and reserves build up.
     */
    MAX_PAYOUT_LIABILITY_CENTS: 50_000_000, // KES 500,000

    /**
     * Time window before market close (in minutes) for "late surge" detection.
     * Bets above the surge threshold within this window are FLAGGED.
     */
    LATE_SURGE_WINDOW_MINUTES: 30,

    /**
     * Minimum single bet size (KES cents) to trigger a late-surge FLAG.
     * KES 5,000 or more in the final 30 min gets flagged for review.
     */
    LATE_SURGE_THRESHOLD_CENTS: 500_000, // KES 5,000

    /**
     * Per-market override: maximum single bet allowed (KES cents).
     * If the market has no override, falls back to odds-engine MAX_BET_CENTS.
     * Keyed by marketId from markets.json.
     */
    MARKET_BET_CAPS: {
        pres_2027: 2_000_000,     // KES 20,000 (political markets — higher risk)
        epl_winner: 5_000_000,    // KES 50,000
        arsenal_quadruple: 3_000_000,
        harambee_afcon: 2_000_000,
        btc_ath: 1_000_000,       // KES 10,000 (crypto — volatile)
    } as Record<string, number>,
} as const

// ── Risk Level Enum ───────────────────────────────────────────────────────────

export type RiskLevel = "CLEAR" | "FLAGGED" | "BLOCKED"

// ── Risk Assessment Result ────────────────────────────────────────────────────

export interface RiskFlag {
    code: string
    message: string
    severity: "INFO" | "WARN" | "CRITICAL"
}

export interface RiskAssessment {
    /** Overall decision for this bet */
    level: RiskLevel
    /** All flags triggered by this bet */
    flags: RiskFlag[]
    /** Maximum allowed stake after risk constraints (may be less than requested) */
    maxAllowedStakeCents: number
    /** Projected platform liability if this bet is accepted */
    projectedLiabilityCents: number
    /** Pool imbalance score (0–1, higher = more imbalanced) */
    imbalanceScore: number
}

// ── Core Risk Functions ───────────────────────────────────────────────────────

/**
 * Calculates platform's maximum liability for the current pool.
 *
 * Liability = what the platform would have to pay out if the most-staked
 * outcome wins AND the entire prize pool goes to those winners.
 *
 * In practice: liability = prize_pool (the house revenue is already "safe")
 *
 * @param pools - Current outcome pools in KES cents
 * @param houseMarginBps - House margin in basis points
 */
export function calculateMaxLiability(
    pools: OutcomePools,
    houseMarginBps: number = 500
): number {
    const total = calculateTotalPool(pools)
    const houseRevenue = calculateHouseRevenue(total, houseMarginBps)
    // Worst case: platform pays out the entire prize pool
    return total - houseRevenue
}

/**
 * Calculates how imbalanced a pool is.
 * 0 = perfectly balanced (all outcomes have equal stakes)
 * 1 = completely imbalanced (all money on one outcome)
 *
 * Uses the Herfindahl-Hirschman Index (HHI) normalized to [0,1].
 * HHI is standard in economics for measuring market concentration.
 */
export function calculatePoolImbalance(pools: OutcomePools): number {
    const total = calculateTotalPool(pools)
    if (total === 0) return 0

    const n = Object.keys(pools).length
    if (n <= 1) return 1

    // HHI = sum of squared market shares
    const hhi = Object.values(pools).reduce((sum, stake) => {
        const share = stake / total
        return sum + share * share
    }, 0)

    // Normalize: HHI range is [1/n, 1], map to [0, 1]
    const hhiMin = 1 / n
    const normalized = (hhi - hhiMin) / (1 - hhiMin)
    return parseFloat(normalized.toFixed(4))
}

/**
 * Checks if a single outcome's pool fraction exceeds the safety cap.
 *
 * @param outcomePoolCents - Proposed pool size for the outcome (AFTER adding new stake)
 * @param totalPoolCents - Proposed total pool (AFTER adding new stake)
 */
export function isOutcomeConcentrated(
    outcomePoolCents: number,
    totalPoolCents: number
): boolean {
    if (totalPoolCents === 0) return false
    return (outcomePoolCents / totalPoolCents) >= RISK_CONFIG.MAX_SINGLE_OUTCOME_POOL_FRACTION
}

/**
 * Checks whether a user owns too large a fraction of a specific outcome's pool.
 *
 * @param userExistingStakeCents - What the user already has on this outcome
 * @param newStakeCents - What they're about to add
 * @param outcomePoolCentsAfter - Total on this outcome AFTER the new bet
 */
export function isUserConcentrationTooHigh(
    userExistingStakeCents: number,
    newStakeCents: number,
    outcomePoolCentsAfter: number
): boolean {
    if (outcomePoolCentsAfter === 0) return false
    const userTotalAfter = userExistingStakeCents + newStakeCents
    return (userTotalAfter / outcomePoolCentsAfter) > RISK_CONFIG.MAX_USER_OUTCOME_OWNERSHIP_FRACTION
}

/**
 * Detects a late-surge bet: a large bet placed close to market close.
 *
 * @param stakeCents - Bet size in KES cents
 * @param marketClosesAt - Market close datetime
 */
export function isLateSurgeBet(stakeCents: number, marketClosesAt: Date): boolean {
    const now = Date.now()
    const closeTime = marketClosesAt.getTime()
    const windowMs = RISK_CONFIG.LATE_SURGE_WINDOW_MINUTES * 60 * 1000

    const isNearClose = now >= closeTime - windowMs && now < closeTime
    const isLarge = stakeCents >= RISK_CONFIG.LATE_SURGE_THRESHOLD_CENTS

    return isNearClose && isLarge
}

/**
 * Gets the effective maximum bet size for a specific market.
 * Uses the market-specific cap if defined, otherwise global default.
 */
export function getMarketBetCap(marketId: string): number {
    return RISK_CONFIG.MARKET_BET_CAPS[marketId] ?? 10_000_000 // KES 100,000 global default
}

// ── Main Assessment Function ──────────────────────────────────────────────────

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ASSESS BET RISK  (call this before every bet placement)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Runs all risk checks in sequence and returns a consolidated assessment.
 * The market-betting service calls this before any wallet/DB operation.
 *
 * @param params.userId - Bettor's user ID
 * @param params.marketId - Market being bet on
 * @param params.outcome - Chosen outcome
 * @param params.stakeCents - Proposed bet in KES cents
 * @param params.currentPools - Live pool snapshot (from getLivePool())
 * @param params.userExistingStakeOnOutcome - User's existing stake on this exact outcome
 * @param params.houseMarginBps - House margin
 * @param params.marketClosesAt - Market close datetime
 */
export function assessBetRisk(params: {
    userId: string
    marketId: string
    outcome: string
    stakeCents: number
    currentPools: OutcomePools
    userExistingStakeOnOutcome: number
    houseMarginBps: number
    marketClosesAt: Date
}): RiskAssessment {
    const {
        marketId,
        outcome,
        stakeCents,
        currentPools,
        userExistingStakeOnOutcome,
        houseMarginBps,
        marketClosesAt,
    } = params

    const flags: RiskFlag[] = []
    let level: RiskLevel = "CLEAR"

    // Project the pool AFTER this bet is added
    const projectedPools: OutcomePools = {
        ...currentPools,
        [outcome]: (currentPools[outcome] ?? 0) + stakeCents,
    }
    const projectedTotalCents = calculateTotalPool(projectedPools)
    const projectedLiabilityCents = calculateMaxLiability(projectedPools, houseMarginBps)

    // ── CHECK 1: Market-specific bet cap ──────────────────────────────────────
    const marketCap = getMarketBetCap(marketId)
    if (stakeCents > marketCap) {
        flags.push({
            code: "BET_EXCEEDS_MARKET_CAP",
            severity: "CRITICAL",
            message: `Bet of KES ${(stakeCents / 100).toLocaleString()} exceeds market cap of KES ${(marketCap / 100).toLocaleString()} for market "${marketId}".`,
        })
        level = "BLOCKED"
    }

    // ── CHECK 2: Platform liability cap ───────────────────────────────────────
    if (projectedLiabilityCents > RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS) {
        flags.push({
            code: "PLATFORM_LIABILITY_EXCEEDED",
            severity: "CRITICAL",
            message: `This bet would push platform liability to KES ${(projectedLiabilityCents / 100).toLocaleString()}, exceeding the maximum of KES ${(RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS / 100).toLocaleString()}.`,
        })
        level = "BLOCKED"
    }

    // ── CHECK 3: Outcome concentration ────────────────────────────────────────
    // Skip when total pool is still in seed phase — concentration is meaningless
    // when the first bettors haven't yet built up liquidity.
    const projectedOutcomePool = projectedPools[outcome] ?? 0
    const poolIsMature = projectedTotalCents >= RISK_CONFIG.MIN_POOL_FOR_CONCENTRATION_CHECK
    if (poolIsMature && isOutcomeConcentrated(projectedOutcomePool, projectedTotalCents)) {
        const fraction = ((projectedOutcomePool / projectedTotalCents) * 100).toFixed(1)
        flags.push({
            code: "OUTCOME_CONCENTRATION",
            severity: "CRITICAL",
            message: `This bet would make "${outcome}" represent ${fraction}% of the pool (limit: ${(RISK_CONFIG.MAX_SINGLE_OUTCOME_POOL_FRACTION * 100).toFixed(0)}%). Bet blocked to protect pool balance.`,
        })
        level = "BLOCKED"
    }

    // ── CHECK 4: Per-user outcome ownership ───────────────────────────────────
    // Also skip during seed phase — a single user seeding a fresh market is fine.
    if (poolIsMature && isUserConcentrationTooHigh(userExistingStakeOnOutcome, stakeCents, projectedOutcomePool)) {
        const maxAllowed = Math.trunc(projectedOutcomePool * RISK_CONFIG.MAX_USER_OUTCOME_OWNERSHIP_FRACTION) - userExistingStakeOnOutcome
        flags.push({
            code: "USER_CONCENTRATION_TOO_HIGH",
            severity: "CRITICAL",
            message: `You would own more than ${(RISK_CONFIG.MAX_USER_OUTCOME_OWNERSHIP_FRACTION * 100).toFixed(0)}% of the "${outcome}" pool. Maximum additional stake allowed: KES ${(Math.max(0, maxAllowed) / 100).toLocaleString()}.`,
        })
        level = "BLOCKED"
    }

    // ── CHECK 5: Late surge detection (FLAGS only, doesn't block) ─────────────
    if (isLateSurgeBet(stakeCents, marketClosesAt)) {
        flags.push({
            code: "LATE_SURGE_DETECTED",
            severity: "WARN",
            message: `Large bet of KES ${(stakeCents / 100).toLocaleString()} placed within ${RISK_CONFIG.LATE_SURGE_WINDOW_MINUTES} minutes of market close. Flagged for review.`,
        })
        // Only escalate to FLAGGED if not already BLOCKED
        if (level === "CLEAR") level = "FLAGGED"
    }

    // ── CHECK 6: Pool imbalance warning (informational) ───────────────────────
    const imbalanceScore = calculatePoolImbalance(projectedPools)
    if (imbalanceScore > 0.70) {
        flags.push({
            code: "POOL_IMBALANCE_HIGH",
            severity: "INFO",
            message: `Market pool imbalance is high (score: ${imbalanceScore.toFixed(2)}). Odds reflect current betting distribution.`,
        })
        if (level === "CLEAR") level = "FLAGGED"
    }

    // ── Calculate max allowed stake (for UI feedback) ─────────────────────────
    // What's the maximum the user could bet without hitting any BLOCK?
    let maxAllowedStakeCents = marketCap

    // Constraint from liability cap
    const currentLiability = calculateMaxLiability(currentPools, houseMarginBps)
    const liabilityHeadroom = RISK_CONFIG.MAX_PAYOUT_LIABILITY_CENTS - currentLiability
    maxAllowedStakeCents = Math.min(maxAllowedStakeCents, liabilityHeadroom)

    // Concentration constraints only apply once the pool is mature
    const currentTotal = calculateTotalPool(currentPools)
    if (currentTotal >= RISK_CONFIG.MIN_POOL_FOR_CONCENTRATION_CHECK) {
        // Constraint from concentration cap
        const currentOutcomePool = currentPools[outcome] ?? 0
        const maxOnOutcome = Math.trunc(
            (currentTotal * RISK_CONFIG.MAX_SINGLE_OUTCOME_POOL_FRACTION - currentOutcomePool) /
            (1 - RISK_CONFIG.MAX_SINGLE_OUTCOME_POOL_FRACTION)
        )
        maxAllowedStakeCents = Math.min(maxAllowedStakeCents, Math.max(0, maxOnOutcome))

        // Constraint from user ownership cap
        const maxUserStake = Math.trunc(
            (currentOutcomePool * RISK_CONFIG.MAX_USER_OUTCOME_OWNERSHIP_FRACTION - userExistingStakeOnOutcome) /
            (1 - RISK_CONFIG.MAX_USER_OUTCOME_OWNERSHIP_FRACTION)
        )
        maxAllowedStakeCents = Math.min(maxAllowedStakeCents, Math.max(0, maxUserStake))
    }

    maxAllowedStakeCents = Math.max(0, maxAllowedStakeCents)

    return {
        level,
        flags,
        maxAllowedStakeCents,
        projectedLiabilityCents,
        imbalanceScore,
    }
}

// ── Risk Summary Formatters ───────────────────────────────────────────────────

/**
 * Returns a user-friendly risk warning message from an assessment.
 * Used to display inline feedback in the betting UI.
 */
export function formatRiskMessage(assessment: RiskAssessment): string | null {
    if (assessment.level === "CLEAR") return null

    const critical = assessment.flags.find((f) => f.severity === "CRITICAL")
    if (critical) return critical.message

    const warn = assessment.flags.find((f) => f.severity === "WARN")
    if (warn) return warn.message

    return null
}

/**
 * Formats imbalance score as a human-readable description.
 */
export function describeImbalance(score: number): string {
    if (score < 0.2) return "Well balanced"
    if (score < 0.4) return "Slightly skewed"
    if (score < 0.6) return "Moderately skewed"
    if (score < 0.8) return "Heavily skewed"
    return "Extremely concentrated"
}
