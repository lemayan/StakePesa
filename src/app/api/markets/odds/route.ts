import { NextResponse } from "next/server"
import { getMarketOdds, getAllMarketOdds } from "@/lib/market-betting"

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/markets/odds
// GET /api/markets/odds?marketId=epl_winner
//
// Public endpoint — returns live pari-mutuel odds.
// No auth required (odds are publicly visible).
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const marketId = url.searchParams.get("marketId")

        if (marketId) {
            // Single market odds
            const snapshot = await getMarketOdds(marketId)
            if (!snapshot) {
                return NextResponse.json(
                    { error: `Market "${marketId}" not found.` },
                    { status: 404 }
                )
            }
            return NextResponse.json({ success: true, snapshot })
        }

        // All markets odds
        const snapshots = await getAllMarketOdds()
        return NextResponse.json({ success: true, snapshots })
    } catch (err) {
        console.error("[MARKET_ODDS_API]", err)
        return NextResponse.json({ error: "Failed to fetch market odds." }, { status: 500 })
    }
}
