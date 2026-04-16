import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { resolveMarket, cancelMarket } from "@/lib/market-betting"
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

    try {
        if (data.cancel === true) {
            // Cancel market — refund all bets
            const result = await cancelMarket(data.marketId, admin.id!)
            return NextResponse.json({
                success: true,
                action: "CANCELLED",
                ...result,
            })
        } else {
            // Resolve market with winning outcome
            const result = await resolveMarket(data.marketId, data.winningOutcome!, admin.id!)
            return NextResponse.json({
                success: true,
                action: "RESOLVED",
                ...result,
            })
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
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
