import { Suspense } from "react"
import { Navbar } from "@/components/sections/navbar"
import { Hero } from "@/components/sections/hero"
import { StatsBar } from "@/components/sections/stats-bar"
import { HowItWorks } from "@/components/sections/how-it-works"
import { LiveMarkets } from "@/components/sections/live-markets"
import { CallToAction } from "@/components/sections/cta"
import { Footer } from "@/components/sections/footer"
import CookieConsent from "@/components/ui/cookie-consent"
import { db } from "@/lib/db"
import { getSiteConfigAction } from "@/actions/admin"
import { auth } from "@/auth"

async function getLiveTrendingMarkets() {
  const markets = await db.adminMarket.findMany({
    where: { trending: true, status: "OPEN" },
    include: { outcomes: { orderBy: { orderIndex: "asc" } }, sector: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // We need to fetch pools to compute odds
  const marketIds = markets.map(m => m.id)
  const pools = await db.marketPool.findMany({
    where: { marketId: { in: marketIds } },
  })

  const byMarket = new Map<string, typeof pools>()
  for (const p of pools) {
    const list = byMarket.get(p.marketId) ?? []
    list.push(p)
    byMarket.set(p.marketId, list)
  }

  // Parse odds mathematically
  return markets.map(market => {
    const poolRows = byMarket.get(market.id) ?? []
    const totalStake = poolRows.reduce((sum, r) => sum + r.totalStakeCents, 0)
    
    // Fallback to equal weighting if liquidity is 0
    const fallbackOdds = Math.floor(100 / Math.max(1, market.outcomes.length))

    return {
      id: market.id,
      title: market.title,
      category: market.sector.title,
      volumeKES: (totalStake / 100).toLocaleString("en-KE"),
      outcomes: market.outcomes.map(o => {
        const pool = poolRows.find(p => p.outcome === o.name)
        const stake = pool ? pool.totalStakeCents : 0
        const odds = totalStake > 0 ? Math.round((stake / totalStake) * 100) : fallbackOdds
        const decimals = odds > 0 ? (100 / odds).toFixed(1) : "0.0"
        
        return {
          id: o.id,
          name: o.name,
          imageUrl: o.imageUrl,
          odds,
          payout: `${decimals}x`,
        }
      })
    }
  })
}

async function getGlobalSiteStats() {
  const [tradersCount, pools] = await Promise.all([
    db.user.count(),
    db.marketPool.findMany({ select: { totalStakeCents: true } })
  ])

  const totalVolumeKES = pools.reduce((sum, p) => sum + p.totalStakeCents, 0) / 100

  return {
    tradersCount: Math.max(12, tradersCount), // fallback so it doesn't look empty for new deployments
    totalVolumeMil: Math.max(0.1, totalVolumeKES / 1000000) // format in Millions. E.g 8.2 = 8.2M
  }
}

export const revalidate = 60 // Revalidate home page cache heavily

export default async function Home() {
  const sessionPromise = auth()
  
  const [trendingMarkets, siteConfig, globalStats, session] = await Promise.all([
    getLiveTrendingMarkets(),
    getSiteConfigAction(),
    getGlobalSiteStats(),
    sessionPromise
  ])

  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-bg">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <Hero initialTrendingMarkets={trendingMarkets} siteConfig={siteConfig} globalStats={globalStats} />
      <StatsBar />
      <HowItWorks />
      <Suspense fallback={null}>
        <LiveMarkets isLoggedIn={isLoggedIn} />
      </Suspense>
      <CallToAction />
      <Footer />
      <CookieConsent />
    </div>
  )
}

