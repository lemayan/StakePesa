"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { resolveMarket } from "@/lib/market-betting"
import { calculatePoolImbalance, describeImbalance } from "@/lib/risk-engine"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

async function requireAdminSession() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }
  return session
}

const sectorSchema = z.object({
  title: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(80).optional(),
  iconName: z.string().trim().min(1).max(80),
})

export async function createSectorAction(input: z.infer<typeof sectorSchema>) {
  await requireAdminSession()
  const parsed = sectorSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid sector payload." }
  }
  const data = parsed.data

  const slug = slugify(data.slug || data.title)
  const sector = await db.sector.create({
    data: {
      title: data.title,
      slug,
      iconName: data.iconName,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  return { success: true, sector }
}

const updateSectorSchema = sectorSchema.extend({
  id: z.string().uuid(),
})

export async function updateSectorAction(input: z.infer<typeof updateSectorSchema>) {
  await requireAdminSession()
  const parsed = updateSectorSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid sector update payload." }
  }
  const data = parsed.data

  const slug = slugify(data.slug || data.title)
  const sector = await db.sector.update({
    where: { id: data.id },
    data: {
      title: data.title,
      slug,
      iconName: data.iconName,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  revalidatePath("/dashboard/markets")
  return { success: true, sector }
}

export async function deleteSectorAction(id: string) {
  await requireAdminSession()

  const linkedMarkets = await db.adminMarket.count({ where: { sectorId: id } })
  if (linkedMarkets > 0) {
    return { error: "Cannot delete sector with linked markets." }
  }

  await db.sector.delete({ where: { id } })
  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  return { success: true }
}

const marketOutcomeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  seedStakeCents: z.number().int().min(0),
})

const createMarketSchema = z.object({
  title: z.string().trim().min(6).max(180),
  description: z.string().trim().max(1200).optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  sectorId: z.string().uuid(),
  startsAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  houseMarginBps: z.number().int().min(0).max(2000),
  trending: z.boolean().default(false),
  isActive: z.boolean().default(true),
  outcomes: z.array(marketOutcomeSchema).min(2),
})

export async function createAdminMarketAction(input: z.infer<typeof createMarketSchema>) {
  const session = await requireAdminSession()
  const parsed = createMarketSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid market payload." }
  }
  const data = parsed.data

  const startsAt = new Date(data.startsAt)
  const closesAt = new Date(data.closesAt)
  const now = new Date()

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return { error: "Invalid market timing." }
  }
  if (closesAt <= startsAt) {
    return { error: "closesAt must be after startsAt." }
  }
  if (closesAt <= now) {
    return { error: "closesAt cannot be in the past." }
  }

  const slugBase = slugify(data.title)
  const market = await db.$transaction(async (tx) => {
    const created = await tx.adminMarket.create({
      data: {
        title: data.title,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        description: data.description,
        imageUrl: data.imageUrl || null,
        sectorId: data.sectorId,
        startsAt,
        closesAt,
        houseMarginBps: data.houseMarginBps,
        trending: data.trending,
        isActive: data.isActive,
        status: data.isActive ? "OPEN" : "CLOSED",
        createdById: session.user.id,
      },
    })

    const outcomes = await Promise.all(
      data.outcomes.map((outcome, index) =>
        tx.adminMarketOutcome.create({
          data: {
            marketId: created.id,
            name: outcome.name,
            imageUrl: outcome.imageUrl || null,
            seedStakeCents: outcome.seedStakeCents,
            orderIndex: index,
          },
        })
      )
    )

    await Promise.all(
      outcomes.map((outcome) =>
        tx.marketPool.upsert({
          where: {
            marketId_outcome: {
              marketId: created.id,
              outcome: outcome.name,
            },
          },
          create: {
            marketId: created.id,
            outcome: outcome.name,
            totalStakeCents: outcome.seedStakeCents,
            betCount: outcome.seedStakeCents > 0 ? 1 : 0,
            status: data.isActive ? "OPEN" : "CLOSED",
            closesAt,
            houseMarginBps: data.houseMarginBps,
          },
          update: {
            totalStakeCents: outcome.seedStakeCents,
            status: data.isActive ? "OPEN" : "CLOSED",
            closesAt,
            houseMarginBps: data.houseMarginBps,
          },
        })
      )
    )

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_MARKET_CREATED",
        metadata: {
          marketId: created.id,
          title: created.title,
          outcomes: outcomes.map((item) => item.name),
          houseMarginBps: created.houseMarginBps,
          trending: created.trending,
        },
      },
    })

    return created
  })

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/admin/markets")
  revalidatePath("/dashboard/markets")
  revalidateTag("markets", "max")

  return { success: true, marketId: market.id }
}

export async function toggleTrendingAction(marketId: string, trending: boolean) {
  await requireAdminSession()

  await db.adminMarket.update({
    where: { id: marketId },
    data: { trending },
  })

  revalidatePath("/")
  revalidatePath("/admin/markets")
  revalidatePath("/dashboard/markets")
  revalidateTag("markets", "max")
  return { success: true }
}

export async function toggleMarketActiveAction(marketId: string, isActive: boolean) {
  await requireAdminSession()

  const market = await db.adminMarket.update({
    where: { id: marketId },
    data: {
      isActive,
      status: isActive ? "OPEN" : "CLOSED",
    },
    select: { closesAt: true, houseMarginBps: true },
  })

  await db.marketPool.updateMany({
    where: { marketId },
    data: {
      status: isActive ? "OPEN" : "CLOSED",
      closesAt: market.closesAt,
      houseMarginBps: market.houseMarginBps,
    },
  })

  revalidatePath("/")
  revalidatePath("/admin/markets")
  revalidatePath("/dashboard/markets")
  revalidateTag("markets", "max")
  return { success: true }
}

const resolveSchema = z.object({
  marketId: z.string().min(1),
  winningOutcome: z.string().trim().min(1),
  confirmationText: z.literal("RESOLVE"),
})

export async function resolveAdminMarketAction(input: z.infer<typeof resolveSchema>) {
  const session = await requireAdminSession()
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid resolve payload." }
  }
  const data = parsed.data

  const market = await db.adminMarket.findUnique({
    where: { id: data.marketId },
    include: { outcomes: true },
  })

  if (!market) {
    return { error: "Market not found." }
  }
  if (market.status === "SETTLED") {
    return { error: "Market already settled." }
  }
  if (!market.outcomes.some((outcome) => outcome.name === data.winningOutcome)) {
    return { error: "Winning outcome is invalid for this market." }
  }

  await db.adminMarket.update({
    where: { id: data.marketId },
    data: {
      status: "RESOLVING",
      resolvedById: session.user.id,
    },
  })

  const resolution = await resolveMarket(data.marketId, data.winningOutcome, session.user.id)

  await db.adminMarket.update({
    where: { id: data.marketId },
    data: {
      status: "SETTLED",
      resolvedAt: new Date(),
      winningOutcome: data.winningOutcome,
      resolvedById: session.user.id,
    },
  })

  revalidatePath("/")
  revalidatePath("/admin/markets")
  revalidatePath("/admin/resolved")
  revalidatePath("/dashboard/markets")
  revalidateTag("markets", "max")

  return { success: true, resolution }
}

export async function getAdminDashboardDataAction() {
  await requireAdminSession()

  const [sectors, activeMarkets, resolvedMarkets, pools] = await Promise.all([
    db.sector.findMany({ orderBy: { title: "asc" } }),
    db.adminMarket.findMany({
      where: { status: { in: ["OPEN", "CLOSED", "RESOLVING"] } },
      include: { sector: true, outcomes: { orderBy: { orderIndex: "asc" } } },
      orderBy: [{ trending: "desc" }, { createdAt: "desc" }],
    }),
    db.adminMarket.findMany({
      where: { status: "SETTLED" },
      include: { sector: true, outcomes: true },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    }),
    db.marketPool.findMany({
      select: { marketId: true, outcome: true, totalStakeCents: true },
    }),
  ])

  const byMarket = new Map<string, Array<{ outcome: string; stake: number }>>()
  for (const pool of pools) {
    const list = byMarket.get(pool.marketId) ?? []
    list.push({ outcome: pool.outcome, stake: pool.totalStakeCents })
    byMarket.set(pool.marketId, list)
  }

  const activeWithRisk = activeMarkets.map((market) => {
    const poolRows = byMarket.get(market.id) ?? []
    const totalStakeCents = poolRows.reduce((sum, row) => sum + row.stake, 0)
    const pool: Record<string, number> = {}
    for (const outcome of market.outcomes) {
      pool[outcome.name] = poolRows.find((row) => row.outcome === outcome.name)?.stake ?? outcome.seedStakeCents
    }
    const imbalance = calculatePoolImbalance(pool)

    let riskSummary = "Balanced"
    if (imbalance >= 0.8) riskSummary = "High Imbalance Warning"
    else if (imbalance >= 0.6) riskSummary = "Moderate Imbalance"

    return {
      ...market,
      totalStakeCents,
      imbalance,
      imbalanceLabel: describeImbalance(imbalance),
      riskSummary,
    }
  })

  return {
    sectors,
    activeMarkets: activeWithRisk,
    resolvedMarkets,
  }
}

export async function getSiteConfigAction() {
  let config = await db.siteConfig.findUnique({ where: { id: "GLOBAL" } })
  if (!config) {
    config = await db.siteConfig.create({
      data: {
        id: "GLOBAL",
        adText: "Sponsored placements coming soon",
        adUrl: null,
        trendingMessage: "Trending prediction markets based on current events",
      },
    })
  }
  return config
}

const siteConfigSchema = z.object({
  adText: z.string().trim().max(120).optional().or(z.literal("")),
  adUrl: z.string().trim().url().optional().or(z.literal("")),
  trendingMessage: z.string().trim().max(120).optional().or(z.literal("")),
})

export async function updateSiteConfigAction(input: z.infer<typeof siteConfigSchema>) {
  await requireAdminSession()
  const parsed = siteConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid configuration." }
  }
  
  const config = await db.siteConfig.upsert({
    where: { id: "GLOBAL" },
    update: {
      adText: parsed.data.adText || null,
      adUrl: parsed.data.adUrl || null,
      trendingMessage: parsed.data.trendingMessage || null,
    },
    create: {
      id: "GLOBAL",
      adText: parsed.data.adText || null,
      adUrl: parsed.data.adUrl || null,
      trendingMessage: parsed.data.trendingMessage || null,
    },
  })

  revalidatePath("/")
  revalidatePath("/admin/settings")
  return { success: true, config }
}
