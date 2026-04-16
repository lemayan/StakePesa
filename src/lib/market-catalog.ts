import markets from "@/data/markets.json"
import { db } from "@/lib/db"

export type MarketCatalogOption = {
  name: string
  probability: number
}

export type MarketCatalogEntry = {
  id: string
  title: string
  description?: string
  category: string
  imageUrl?: string | null
  startsAt?: string | null
  closesAt?: string | null
  houseMarginBps?: number
  trending?: boolean
  isActive?: boolean
  status?: "OPEN" | "CLOSED" | "RESOLVING" | "SETTLED"
  options: MarketCatalogOption[]
}

function staticCatalog(): MarketCatalogEntry[] {
  return markets.markets.map((market) => ({
    id: market.id,
    title: market.title,
    category: market.category,
    options: market.options.map((option) => ({
      name: option.name,
      probability: option.probability,
    })),
  }))
}

export async function getDbAdminMarketCatalog(): Promise<MarketCatalogEntry[]> {
  const rows = await db.adminMarket.findMany({
    where: {
      isActive: true,
      status: { in: ["OPEN", "CLOSED", "RESOLVING"] },
    },
    include: {
      sector: true,
      outcomes: {
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: [{ trending: "desc" }, { createdAt: "desc" }],
  })

  return rows.map((row) => {
    const n = row.outcomes.length || 1
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      category: row.sector.slug,
      imageUrl: row.imageUrl,
      startsAt: row.startsAt.toISOString(),
      closesAt: row.closesAt.toISOString(),
      houseMarginBps: row.houseMarginBps,
      trending: row.trending,
      isActive: row.isActive,
      status: row.status,
      options: row.outcomes.map((outcome) => ({
        name: outcome.name,
        probability: Number((1 / n).toFixed(4)),
      })),
    }
  })
}

export async function getMarketCatalog(): Promise<MarketCatalogEntry[]> {
  const [staticMarkets, dbMarkets] = await Promise.all([
    Promise.resolve(staticCatalog()),
    getDbAdminMarketCatalog(),
  ])

  const merged = new Map<string, MarketCatalogEntry>()
  for (const market of staticMarkets) {
    merged.set(market.id, market)
  }
  for (const market of dbMarkets) {
    merged.set(market.id, market)
  }

  return Array.from(merged.values())
}

export async function getMarketCatalogById(marketId: string): Promise<MarketCatalogEntry | null> {
  const catalog = await getMarketCatalog()
  return catalog.find((market) => market.id === marketId) ?? null
}
