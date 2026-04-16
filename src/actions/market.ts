"use server"

import { createHash } from "node:crypto"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getWalletBalance } from "@/lib/wallet"
import { claimIdempotencyKey, completeIdempotencyKey, failIdempotencyKey } from "@/lib/reliability"
import {
    placeBet,
    getMarketOdds,
    getAllMarketOdds,
    getUserBettingHistory,
    getStaticMarket,
    getLivePool,
} from "@/lib/market-betting"
import { estimatePotentialPayout } from "@/lib/odds-engine"
import { z } from "zod"

// ──────────────────────────────────────────────────────────────────────────────
// MARKET SERVER ACTIONS  (Phase 1 — Pari-Mutuel Odds Engine)
// ──────────────────────────────────────────────────────────────────────────────

const placeBetSchema = z.object({
    marketId: z.string().min(1),
    outcome: z.string().min(1),
    stakeCents: z.number().int().positive(),
    requestId: z.string().uuid(),
})

/**
 * Server action: place a bet on a market outcome.
 *
 * Validates the session, fetches wallet balance, then delegates
 * to the market-betting service which runs the odds engine & DB ops.
 */
export async function placeBetAction(input: z.infer<typeof placeBetSchema>) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "You must be logged in to place a bet." }
    }

    const parsed = placeBetSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid bet payload." }
    }

    const { marketId, outcome, stakeCents, requestId } = parsed.data

    const scope = `market-place-bet:${session.user.id}`
    const requestHash = createHash("sha256")
        .update(JSON.stringify({ marketId, outcome, stakeCents, userId: session.user.id }))
        .digest("hex")

    const claim = await claimIdempotencyKey(scope, requestId, requestHash)
    if (claim.kind === "mismatch") {
        return { error: "This request ID was already used with a different payload." }
    }
    if (claim.kind === "in-progress") {
        return { error: "This bet is still processing. Please wait." }
    }
    if (claim.kind === "completed") {
        if (typeof claim.responseBody === "object" && claim.responseBody !== null) {
            return claim.responseBody as Record<string, unknown>
        }
        return { error: "Unable to replay previous response for this request." }
    }

    const idempotencyRecordId = claim.id

    try {
        // Pre-fetch wallet balance (passed to service to avoid extra DB round-trip)
        const walletBalance = await getWalletBalance(session.user.id)

        const result = await placeBet(
            session.user.id,
            marketId,
            outcome,
            stakeCents,
            walletBalance
        )

        const responseBody = !result.success
            ? {
                error: result.error,
                riskFlags: result.riskFlags,
                fraudFlags: result.fraudFlags,
                maxAllowedStakeCents: result.maxAllowedStakeCents,
                retryAfterSeconds: result.retryAfterSeconds,
                cooldownEndsAt: result.cooldownEndsAt,
            }
            : {
                success: true,
                betId: result.betId,
                oddsAtPlacement: result.oddsAtPlacement,
                estimatedReturnCents: result.estimatedReturnCents,
                message: `Bet placed! Odds: ${result.oddsAtPlacement?.toFixed(2)}x`,
            }

        await completeIdempotencyKey(idempotencyRecordId, 200, responseBody)
        return responseBody
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        await failIdempotencyKey(idempotencyRecordId, message).catch(() => {
            // Preserve original error path even if idempotency fail-marking fails.
        })
        return { error: `Bet placement failed: ${message}` }
    }
}

/**
 * Server action: get live odds for a single market.
 */
export async function getMarketOddsAction(marketId: string) {
    const snapshot = await getMarketOdds(marketId)
    if (!snapshot) {
        return { error: `Market "${marketId}" not found.` }
    }
    return { success: true, snapshot }
}

/**
 * Server action: get live odds for all markets (for dashboard).
 */
export async function getAllMarketOddsAction() {
    const snapshots = await getAllMarketOdds()
    return { success: true, snapshots }
}

/**
 * Server action: estimate potential payout before placing a bet.
 * Safe to call with no auth (read-only, public market data).
 */
export async function estimatePayoutAction(
    marketId: string,
    outcome: string,
    stakeCents: number
) {
    const staticMarket = getStaticMarket(marketId)
    if (!staticMarket) {
        return { error: `Market "${marketId}" not found.` }
    }

    const pool = await getLivePool(marketId)
    const estimate = estimatePotentialPayout(stakeCents, pool, outcome)

    return {
        success: true,
        estimatedReturnCents: estimate.estimatedReturn,
        estimatedProfitCents: estimate.estimatedProfit,
        currentOdds: estimate.currentOdds,
    }
}

/**
 * Server action: get the current user's bet history with P&L.
 */
export async function getMyBetsAction(limit = 20) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "You must be logged in to view your bets." }
    }

    const history = await getUserBettingHistory(session.user.id, limit)
    return { success: true, bets: history }
}

/**
 * Server action: get user's total market P&L summary.
 */
export async function getMyMarketStatsAction() {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized." }
    }

    const bets = await db.marketBet.findMany({
        where: { userId: session.user.id },
        select: {
            stakeCents: true,
            actualReturnCents: true,
            status: true,
        },
    })

    const totalBets = bets.length
    const totalStakedCents = bets.reduce((s, b) => s + b.stakeCents, 0)
    const totalReturnedCents = bets.reduce(
        (s, b) => s + (b.actualReturnCents ?? 0),
        0
    )
    const wins = bets.filter((b) => b.status === "WON").length
    const losses = bets.filter((b) => b.status === "LOST").length
    const pending = bets.filter((b) => b.status === "PENDING").length
    const netProfitCents = totalReturnedCents - totalStakedCents
    const winRate = totalBets > 0 ? (wins / (wins + losses)) * 100 : 0

    return {
        success: true,
        stats: {
            totalBets,
            wins,
            losses,
            pending,
            totalStakedCents,
            totalReturnedCents,
            netProfitCents,
            winRate: parseFloat(winRate.toFixed(1)),
        },
    }
}
