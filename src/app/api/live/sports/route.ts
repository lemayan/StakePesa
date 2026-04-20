import { NextResponse } from "next/server"

export const revalidate = 1800 // 30 min cache — fixtures don't change often

// TheSportsDB league IDs
const LEAGUES = [
  { id: "4328", name: "English Premier League", short: "EPL" },
  { id: "4480", name: "UEFA Champions League", short: "UCL" },
  { id: "8133", name: "Harambee Stars", short: "KEN" },
]

export async function GET() {
  try {
    const results = await Promise.allSettled(
      LEAGUES.map(async (league) => {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.id}`,
          { next: { revalidate: 1800 } }
        )
        if (!res.ok) return { league, fixtures: [] }
        const data = await res.json()
        const events = (data?.events ?? []).slice(0, 3)
        return {
          league,
          fixtures: events.map((e: Record<string, string>) => ({
            id: e.idEvent,
            homeTeam: e.strHomeTeam,
            awayTeam: e.strAwayTeam,
            kickoff: e.strTimestamp ?? e.dateEvent,
            venue: e.strVenue ?? null,
            round: e.intRound ?? null,
          })),
        }
      })
    )

    const data = results
      .filter((r): r is PromiseFulfilledResult<{ league: typeof LEAGUES[0]; fixtures: unknown[] }> => r.status === "fulfilled")
      .map((r) => r.value)

    return NextResponse.json({ leagues: data, updatedAt: Date.now() })
  } catch (err) {
    console.error("[/api/live/sports]", err)
    return NextResponse.json({ error: "Failed to fetch sports data" }, { status: 500 })
  }
}
