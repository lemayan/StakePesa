import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { resolveMarket, cancelMarket, getMarketSettlementSummary } from "@/lib/market-betting"
import { claimIdempotencyKey, completeIdempotencyKey, failIdempotencyKey } from "@/lib/reliability"
import { z } from "zod"

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/markets/resolve
//
// Admin-only endpoint to resolve a market and trigger payouts.
// Body: { marketId, winningOutcome } → RESOLVE
// Body: { marketId, cancel: true }  → CANCEL (refund all)
// ──────────────────────────────────────────────────────────────────────────────

const resolveSchema = z.union([
    z.object({
        marketId: z.string().min(1),
        winningOutcome: z.string().min(1),
        cancel: z.undefined(),
    }),
    z.object({
        marketId: z.string().min(1),
        cancel: z.literal(true),
        winningOutcome: z.undefined(),
    }),
])

/** Simple admin check — extend to a proper role system when needed. */
async function requireAdmin(request: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return null
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase())
    const userEmail = session.user.email?.toLowerCase() ?? ""

    if (!adminEmails.includes(userEmail)) {
        return null
    }

    return session.user
}

export async function POST(request: Request) {
    const admin = await requireAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 })
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = resolveSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
            { status: 400 }
        )
    }

    const data = parsed.data
    const idempotencyScope = "admin-markets-resolve"
    const idempotencyKey = request.headers.get("idempotency-key")?.trim()
        || `auto:${admin.id}:${data.marketId}:${data.cancel === true ? "cancel" : `resolve:${data.winningOutcome}`}`
    const requestHash = createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex")

    const claim = await claimIdempotencyKey(idempotencyScope, idempotencyKey, requestHash)
    if (claim.kind === "mismatch") {
        return NextResponse.json(
            { error: "Idempotency key reused with different payload." },
            { status: 409 }
        )
    }
    if (claim.kind === "completed") {
        return NextResponse.json(claim.responseBody, { status: claim.responseStatus })
    }
    if (claim.kind === "in-progress") {
        return NextResponse.json(
            { error: "A request with this idempotency key is still processing." },
            { status: 409 }
        )
    }

    const idempotencyRecordId = claim.id

    try {
        const currentState = await db.marketPool.findFirst({
            where: { marketId: data.marketId },
            orderBy: { updatedAt: "desc" },
            select: { status: true, winningOutcome: true },
        })

        if (data.cancel === true) {
            if (currentState?.status === "CANCELLED") {
                const summary = await getMarketSettlementSummary(data.marketId)
                const responseBody = {
                    success: true,
                    action: "CANCELLED",
                    idempotentReplay: true,
                    idempotencyKey,
                    refunded: summary?.totalRefundedBets ?? 0,
                    totalRefundedCents: summary?.totalRefundedCents ?? 0,
                }
                await completeIdempotencyKey(idempotencyRecordId, 200, responseBody)
                return NextResponse.json(responseBody)
            }

            if (currentState?.status === "RESOLVED") {
                const responseBody = { error: "Market already resolved; cannot cancel after resolution." }
                await completeIdempotencyKey(idempotencyRecordId, 409, responseBody)
                return NextResponse.json(responseBody, { status: 409 })
            }

            // Cancel market — refund all bets
            const result = await cancelMarket(data.marketId, admin.id!, idempotencyKey)
            const responseBody = {
                success: true,
                action: "CANCELLED",
                idempotencyKey,
                ...result,
            }
            await completeIdempotencyKey(idempotencyRecordId, 200, responseBody)
            return NextResponse.json(responseBody)
        } else {
            if (currentState?.status === "RESOLVED") {
                if (currentState.winningOutcome !== data.winningOutcome) {
                    const responseBody = {
                        error: `Market already resolved with outcome \"${currentState.winningOutcome}\". Cannot re-resolve with \"${data.winningOutcome}\".`,
                    }
                    await completeIdempotencyKey(idempotencyRecordId, 409, responseBody)
                    return NextResponse.json(responseBody, { status: 409 })
                }

                const summary = await getMarketSettlementSummary(data.marketId)
                const responseBody = {
                    success: true,
                    action: "RESOLVED",
                    idempotentReplay: true,
                    idempotencyKey,
                    marketId: data.marketId,
                    winningOutcome: data.winningOutcome,
                    totalWinners: summary?.totalWinners ?? 0,
                    totalLosers: summary?.totalLosers ?? 0,
                    totalRefundedBets: summary?.totalRefundedBets ?? 0,
                    houseRevenueCents: summary?.houseRevenueCents ?? 0,
                    totalPayoutCents: summary?.totalPayoutCents ?? 0,
                }
                await completeIdempotencyKey(idempotencyRecordId, 200, responseBody)
                return NextResponse.json(responseBody)
            }

            if (currentState?.status === "CANCELLED") {
                const responseBody = { error: "Market already cancelled; cannot resolve a cancelled market." }
                await completeIdempotencyKey(idempotencyRecordId, 409, responseBody)
                return NextResponse.json(responseBody, { status: 409 })
            }

            // Resolve market with winning outcome
            const result = await resolveMarket(data.marketId, data.winningOutcome!, admin.id!, idempotencyKey)
            const responseBody = {
                success: true,
                action: "RESOLVED",
                idempotencyKey,
                ...result,
            }
            await completeIdempotencyKey(idempotencyRecordId, 200, responseBody)
            return NextResponse.json(responseBody)
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        try {
            await failIdempotencyKey(idempotencyRecordId, message)
        } catch (idempotencyErr) {
            console.error("[ADMIN_RESOLVE_MARKET][IDEMPOTENCY_FAIL]", idempotencyErr)
        }
        console.error("[ADMIN_RESOLVE_MARKET]", err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// GET /api/admin/markets/resolve — list all markets with pool stats
export async function GET(request: Request) {
    const admin = await requireAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    const pools = await db.marketPool.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
            marketId: true,
            outcome: true,
            totalStakeCents: true,
            betCount: true,
            status: true,
            closesAt: true,
            winningOutcome: true,
            houseMarginBps: true,
            updatedAt: true,
        },
    })

    // Group by marketId
    const byMarket: Record<string, typeof pools> = {}
    for (const row of pools) {
        if (!byMarket[row.marketId]) byMarket[row.marketId] = []
        byMarket[row.marketId].push(row)
    }

    const summary = Object.entries(byMarket).map(([marketId, rows]) => ({
        marketId,
        status: rows[0]?.status ?? "OPEN",
        winningOutcome: rows[0]?.winningOutcome ?? null,
        totalPoolCents: rows.reduce((s, r) => s + r.totalStakeCents, 0),
        totalBets: rows.reduce((s, r) => s + r.betCount, 0),
        outcomes: rows.map((r) => ({
            outcome: r.outcome,
            stakeCents: r.totalStakeCents,
            bets: r.betCount,
        })),
        closesAt: rows[0]?.closesAt,
        houseMarginBps: rows[0]?.houseMarginBps ?? 500,
        lastUpdated: rows[0]?.updatedAt,
    }))

    return NextResponse.json({ success: true, markets: summary })
}
