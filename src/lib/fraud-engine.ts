// ──────────────────────────────────────────────────────────────────────────────
// STAKEPESA FRAUD ENGINE  (Phase 4)
// ──────────────────────────────────────────────────────────────────────────────
//
// PURPOSE:
//   Detects suspicious betting behavior patterns that may indicate automation,
//   abuse, account sharing, or bonus/velocity exploitation.
//
// DESIGN:
//   This module is pure and deterministic. It evaluates pre-computed activity
//   signals and returns a decision: CLEAR, FLAGGED, or BLOCKED.
//
// UNITS: All monetary values in KES cents.
// ──────────────────────────────────────────────────────────────────────────────

export type FraudLevel = "CLEAR" | "FLAGGED" | "BLOCKED"

export interface FraudFlag {
    code: string
    message: string
    severity: "INFO" | "WARN" | "CRITICAL"
}

export interface FraudAssessment {
    level: FraudLevel
    score: number
    flags: FraudFlag[]
}

export interface FraudSignals {
    userId: string
    marketId: string
    outcome: string
    stakeCents: number
    betsLast2Min: number
    betsLast5Min: number
    betsLast15Min: number
    sameMarketBetsLast2Min: number
    identicalStakeCountLast15Min: number
    stakeLast5MinCents: number
}

export const FRAUD_CONFIG = {
    // Hard blocks
    MAX_BETS_PER_5_MIN: 8,
    MAX_STAKE_PER_5_MIN_CENTS: 3_000_000, // KES 30,000
    MAX_SAME_MARKET_BETS_PER_2_MIN: 5,

    // Soft flags
    IDENTICAL_STAKE_BURST_COUNT: 4,
    HIGH_ACTIVITY_15_MIN: 12,
    LARGE_SINGLE_BET_REVIEW_CENTS: 1_000_000, // KES 10,000
} as const

export function assessBetFraud(signals: FraudSignals): FraudAssessment {
    const flags: FraudFlag[] = []
    let level: FraudLevel = "CLEAR"
    let score = 0

    const projectedBets5Min = signals.betsLast5Min + 1
    const projectedStake5Min = signals.stakeLast5MinCents + signals.stakeCents
    const projectedSameMarket2Min = signals.sameMarketBetsLast2Min + 1
    const projectedIdenticalStakes = signals.identicalStakeCountLast15Min + 1
    const projectedBets15Min = signals.betsLast15Min + 1

    if (projectedBets5Min > FRAUD_CONFIG.MAX_BETS_PER_5_MIN) {
        flags.push({
            code: "FRAUD_BET_VELOCITY_EXCEEDED",
            severity: "CRITICAL",
            message: `Too many bets in a short window (${projectedBets5Min} in 5 minutes). Please slow down and try again shortly.`,
        })
        level = "BLOCKED"
        score += 60
    }

    if (projectedStake5Min > FRAUD_CONFIG.MAX_STAKE_PER_5_MIN_CENTS) {
        flags.push({
            code: "FRAUD_STAKE_VELOCITY_EXCEEDED",
            severity: "CRITICAL",
            message: `Your recent staking volume is too high for a 5-minute window (KES ${(projectedStake5Min / 100).toLocaleString()}). Please wait before placing another bet.`,
        })
        level = "BLOCKED"
        score += 60
    }

    if (projectedSameMarket2Min > FRAUD_CONFIG.MAX_SAME_MARKET_BETS_PER_2_MIN) {
        flags.push({
            code: "FRAUD_MARKET_HAMMERING",
            severity: "CRITICAL",
            message: `Rapid repeated bets on this market were detected (${projectedSameMarket2Min} in 2 minutes). This attempt has been blocked for safety.`,
        })
        level = "BLOCKED"
        score += 50
    }

    if (projectedIdenticalStakes >= FRAUD_CONFIG.IDENTICAL_STAKE_BURST_COUNT) {
        flags.push({
            code: "FRAUD_IDENTICAL_STAKE_PATTERN",
            severity: "WARN",
            message: "Repeated identical stake pattern detected. Activity has been flagged for automated abuse review.",
        })
        if (level === "CLEAR") level = "FLAGGED"
        score += 20
    }

    if (projectedBets15Min >= FRAUD_CONFIG.HIGH_ACTIVITY_15_MIN) {
        flags.push({
            code: "FRAUD_HIGH_ACTIVITY",
            severity: "WARN",
            message: `High betting activity detected (${projectedBets15Min} in 15 minutes).`,
        })
        if (level === "CLEAR") level = "FLAGGED"
        score += 15
    }

    if (signals.stakeCents >= FRAUD_CONFIG.LARGE_SINGLE_BET_REVIEW_CENTS) {
        flags.push({
            code: "FRAUD_LARGE_SINGLE_BET_REVIEW",
            severity: "INFO",
            message: `Large single bet detected (KES ${(signals.stakeCents / 100).toLocaleString()}).`,
        })
        if (level === "CLEAR") level = "FLAGGED"
        score += 5
    }

    return {
        level,
        score: Math.min(100, score),
        flags,
    }
}

export function formatFraudMessage(assessment: FraudAssessment): string | null {
    if (assessment.level === "CLEAR") return null

    const critical = assessment.flags.find((f) => f.severity === "CRITICAL")
    if (critical) return critical.message

    const warn = assessment.flags.find((f) => f.severity === "WARN")
    if (warn) return warn.message

    const info = assessment.flags.find((f) => f.severity === "INFO")
    return info?.message ?? null
}
