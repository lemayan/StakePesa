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

type PlaceBetActionResponse =
    | {
        success: true
        betId?: string
        oddsAtPlacement?: number
        estimatedReturnCents?: number
        message?: string
    }
    | {
        success?: false
        error: string
        riskFlags?: Array<{ code: string; message: string; severity: string }>
        fraudFlags?: Array<{ code: string; message: string; severity: string }>
        maxAllowedStakeCents?: number
        retryAfterSeconds?: number
        cooldownEndsAt?: string
    }

/**
 * Server action: place a bet on a market outcome.
 *
 * Validates the session, fetches wallet balance, then delegates
 * to the market-betting service which runs the odds engine & DB ops.
 */
export async function placeBetAction(input: z.infer<typeof placeBetSchema>): Promise<PlaceBetActionResponse> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "You must be logged in to place a bet." }
    }

    const parsed = placeBetSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid bet payload." }
    }

    const { marketId, outcome, stakeCents, requestId } = parsed.data

    let idempotencyRecordId: string | null = null

    try {
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
                return claim.responseBody as PlaceBetActionResponse
            }
            return { error: "Unable to replay previous response for this request." }
        }

        idempotencyRecordId = claim.id

        // Pre-fetch wallet balance (passed to service to avoid extra DB round-trip)
        const walletBalance = await getWalletBalance(session.user.id)

        const result = await placeBet(
            session.user.id,
            marketId,
            outcome,
            stakeCents,
            walletBalance
        )

        const responseBody: PlaceBetActionResponse = !result.success
            ? {
            success: false,
            error: result.error ?? "Bet failed. Please try again.",
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
        if (idempotencyRecordId) {
            await failIdempotencyKey(idempotencyRecordId, message).catch(() => {
                // Preserve original error path even if idempotency fail-marking fails.
            })
        }
        console.error("[placeBetAction] Error:", message)
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
    const staticMarket = await getStaticMarket(marketId)
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

// ──────────────────────────────────────────────────────────────────────────────
// MARKET COMMENTS
// ──────────────────────────────────────────────────────────────────────────────

export type MarketCommentData = {
    id: string
    body: string
    createdAt: string
    user: {
        id: string
        name: string | null
        image: string | null
    }
}

/**
 * Server action: post a comment on a market.
 */
export async function postCommentAction(
    marketId: string,
    body: string
): Promise<{ success: true; comment: MarketCommentData } | { error: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "You must be logged in to comment." }
    }

    const trimmed = body.trim()
    if (!trimmed || trimmed.length < 2) {
        return { error: "Comment is too short." }
    }
    if (trimmed.length > 280) {
        return { error: "Comment must be 280 characters or less." }
    }

    try {
        const comment = await db.marketComment.create({
            data: {
                marketId,
                userId: session.user.id,
                body: trimmed,
            },
            select: {
                id: true,
                body: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        })

        return {
            success: true,
            comment: {
                ...comment,
                createdAt: comment.createdAt.toISOString(),
            },
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error("[postCommentAction]", message)
        return { error: "Failed to post comment. Please try again." }
    }
}

/**
 * Server action: get comments for a market (newest first, limit 50).
 */
export async function getCommentsAction(
    marketId: string
): Promise<{ success: true; comments: MarketCommentData[] } | { error: string }> {
    try {
        const rows = await db.marketComment.findMany({
            where: { marketId },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                body: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        })

        return {
            success: true,
            comments: rows.map((r) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
            })),
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error("[getCommentsAction]", message)
        return { error: "Failed to load comments." }
    }
}
