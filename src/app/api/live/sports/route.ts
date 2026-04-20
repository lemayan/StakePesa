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
    const fetchedAt = Date.now()
    const [liveScoreRes, results] = await Promise.all([
      fetch("https://www.thesportsdb.com/api/v1/json/3/livescore.php?s=Soccer", {
        next: { revalidate: 60 },
      }).catch(() => null),
      Promise.allSettled(
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
      ),
    ])

    let liveEvents: Array<Record<string, unknown>> = []
    if (liveScoreRes?.ok) {
      const liveJson = await liveScoreRes.json().catch(() => null)
      if (liveJson && Array.isArray(liveJson.events)) {
        liveEvents = liveJson.events as Array<Record<string, unknown>>
      }
    }

    const scoreByTeams = new Map<
      string,
      {
        homeScore: number | null
        awayScore: number | null
        status: string | null
        updatedAt: number
        events: string[]
      }
    >()
    for (const event of liveEvents) {
      const home = typeof event.strHomeTeam === "string" ? event.strHomeTeam : ""
      const away = typeof event.strAwayTeam === "string" ? event.strAwayTeam : ""
      if (!home || !away) continue

      const homeRaw = event.intHomeScore
      const awayRaw = event.intAwayScore
      const homeScore = typeof homeRaw === "string" ? Number.parseInt(homeRaw, 10) : typeof homeRaw === "number" ? homeRaw : null
      const awayScore = typeof awayRaw === "string" ? Number.parseInt(awayRaw, 10) : typeof awayRaw === "number" ? awayRaw : null
      const status = typeof event.strStatus === "string"
        ? event.strStatus
        : typeof event.strProgress === "string"
          ? event.strProgress
          : null

      const events: string[] = []
      const homeGoals = typeof event.strHomeGoalDetails === "string" ? event.strHomeGoalDetails : ""
      const awayGoals = typeof event.strAwayGoalDetails === "string" ? event.strAwayGoalDetails : ""
      if (homeGoals.trim()) events.push(`${home}: ${homeGoals.split(";").slice(0, 2).join("; ")}`)
      if (awayGoals.trim()) events.push(`${away}: ${awayGoals.split(";").slice(0, 2).join("; ")}`)

      const homeRed = typeof event.intHomeRedCards === "string" ? Number.parseInt(event.intHomeRedCards, 10) : null
      const awayRed = typeof event.intAwayRedCards === "string" ? Number.parseInt(event.intAwayRedCards, 10) : null
      if ((homeRed ?? 0) > 0) events.push(`${home} red cards: ${homeRed}`)
      if ((awayRed ?? 0) > 0) events.push(`${away} red cards: ${awayRed}`)

      const homeYellow = typeof event.intHomeYellowCards === "string" ? Number.parseInt(event.intHomeYellowCards, 10) : null
      const awayYellow = typeof event.intAwayYellowCards === "string" ? Number.parseInt(event.intAwayYellowCards, 10) : null
      if ((homeYellow ?? 0) > 0) events.push(`${home} yellows: ${homeYellow}`)
      if ((awayYellow ?? 0) > 0) events.push(`${away} yellows: ${awayYellow}`)

      scoreByTeams.set(`${home}__${away}`.toLowerCase(), {
        homeScore,
        awayScore,
        status,
        updatedAt: fetchedAt,
        events,
      })
    }

    const data = results
      .filter((r): r is PromiseFulfilledResult<{ league: typeof LEAGUES[0]; fixtures: unknown[] }> => r.status === "fulfilled")
      .map((r) => ({
        ...r.value,
        fixtures: r.value.fixtures.map((fixture) => {
          const f = fixture as {
            id: string
            homeTeam: string
            awayTeam: string
            kickoff: string
            venue: string | null
            round: string | null
          }
          const score = scoreByTeams.get(`${f.homeTeam}__${f.awayTeam}`.toLowerCase())
          return {
            ...f,
            homeScore: score?.homeScore ?? null,
            awayScore: score?.awayScore ?? null,
            liveStatus: score?.status ?? null,
            liveEvents: score?.events ?? [],
            liveUpdatedAt: score?.updatedAt ?? fetchedAt,
          }
        }),
      }))

    return NextResponse.json({ leagues: data, updatedAt: fetchedAt })
  } catch (err) {
    console.error("[/api/live/sports]", err)
    return NextResponse.json({ error: "Failed to fetch sports data" }, { status: 500 })
  }
}
