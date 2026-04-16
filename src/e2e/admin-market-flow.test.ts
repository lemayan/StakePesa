import test from "node:test"
import assert from "node:assert/strict"
import { PrismaClient } from "@prisma/client"
import { getMarketCatalogById } from "@/lib/market-catalog"
import { resolveMarket } from "@/lib/market-betting"

const RUN_DB_E2E = process.env.RUN_ADMIN_E2E_DB === "1"

test(
  "admin e2e: create market -> appears on public catalog -> resolve workflow",
  { skip: !RUN_DB_E2E },
  async () => {
    const db = new PrismaClient()

    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAILS?.split(",")[0]?.trim() ?? "e2e-admin@weka-pesa.local"

    let admin = await db.user.findUnique({ where: { email: adminEmail } })
    let createdAdminUserId: string | null = null
    if (!admin) {
      admin = await db.user.create({
        data: {
          name: "E2E Admin",
          email: adminEmail,
          role: "ADMIN",
          emailVerified: new Date(),
        },
      })
      createdAdminUserId = admin.id
    }

    assert.ok(admin?.id, `Admin user bootstrap failed for email ${adminEmail}`)

    const runId = Date.now().toString(36)
    const sectorSlug = `e2e-sector-${runId}`
    const marketSlug = `e2e-market-${runId}`
    const marketId = `e2e_market_${runId}`
    const winningOutcome = "YES"

    try {
      const sector = await db.sector.create({
        data: {
          title: "E2E Sector",
          slug: sectorSlug,
          iconName: "FlaskConical",
        },
      })

      await db.adminMarket.create({
        data: {
          id: marketId,
          slug: marketSlug,
          title: `E2E Admin Market ${runId}`,
          description: "DB-backed admin market lifecycle smoke test",
          sectorId: sector.id,
          createdById: admin.id,
          startsAt: new Date(Date.now() - 5 * 60 * 1000),
          closesAt: new Date(Date.now() + 60 * 60 * 1000),
          houseMarginBps: 500,
          trending: true,
          isActive: true,
          status: "OPEN",
          outcomes: {
            create: [
              { name: "YES", seedStakeCents: 2500, orderIndex: 0 },
              { name: "NO", seedStakeCents: 2500, orderIndex: 1 },
            ],
          },
        },
      })

      await db.marketPool.createMany({
        data: [
          {
            marketId,
            outcome: "YES",
            totalStakeCents: 2500,
            betCount: 1,
            status: "OPEN",
            closesAt: new Date(Date.now() + 60 * 60 * 1000),
            houseMarginBps: 500,
          },
          {
            marketId,
            outcome: "NO",
            totalStakeCents: 2500,
            betCount: 1,
            status: "OPEN",
            closesAt: new Date(Date.now() + 60 * 60 * 1000),
            houseMarginBps: 500,
          },
        ],
      })

      const catalogEntry = await getMarketCatalogById(marketId)
      assert.ok(catalogEntry, "Created admin market should appear in public catalog")
      assert.equal(catalogEntry?.id, marketId)

      await db.adminMarket.update({
        where: { id: marketId },
        data: { status: "RESOLVING", resolvedById: admin.id },
      })

      const resolution = await resolveMarket(marketId, winningOutcome, admin.id)
      assert.equal(resolution.marketId, marketId)
      assert.equal(resolution.winningOutcome, winningOutcome)

      await db.adminMarket.update({
        where: { id: marketId },
        data: {
          status: "SETTLED",
          resolvedAt: new Date(),
          winningOutcome,
          resolvedById: admin.id,
        },
      })

      const pools = await db.marketPool.findMany({ where: { marketId } })
      assert.equal(pools.length, 2)
      assert.ok(pools.every((p) => p.status === "RESOLVED"))
      assert.ok(pools.every((p) => p.winningOutcome === winningOutcome))

      const settled = await db.adminMarket.findUnique({
        where: { id: marketId },
        select: { status: true, winningOutcome: true },
      })
      assert.equal(settled?.status, "SETTLED")
      assert.equal(settled?.winningOutcome, winningOutcome)
    } finally {
      await db.marketBet.deleteMany({ where: { marketId } })
      await db.marketPool.deleteMany({ where: { marketId } })
      await db.adminMarketOutcome.deleteMany({ where: { marketId } })
      await db.adminMarket.deleteMany({ where: { id: marketId } })
      await db.sector.deleteMany({ where: { slug: sectorSlug } })
      if (createdAdminUserId) {
        await db.auditLog.deleteMany({ where: { userId: createdAdminUserId } })
        await db.user.delete({ where: { id: createdAdminUserId } })
      }
      await db.$disconnect()
    }
  }
)
