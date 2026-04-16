import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const REQUIRED_ENV = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_EMAILS",
  "OUTBOX_WORKER_SECRET",
  "OUTBOX_PROCESSING_LEASE_SECONDS",
  "CRON_SECRET",
  "MONITORING_SECRET",
] as const

const REQUIRED_TABLES = ["Sector", "AdminMarket", "AdminMarketOutcome"] as const
const REQUIRED_INDEXES = [
  "Sector_slug_key",
  "Sector_title_idx",
  "AdminMarket_slug_key",
  "AdminMarket_sectorId_idx",
  "AdminMarket_status_idx",
  "AdminMarket_trending_idx",
  "AdminMarket_isActive_idx",
  "AdminMarket_startsAt_idx",
  "AdminMarket_closesAt_idx",
  "AdminMarketOutcome_marketId_name_key",
  "AdminMarketOutcome_marketId_idx",
] as const

async function main() {
  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name] || process.env[name]?.trim() === "")

  const tableRows = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (${REQUIRED_TABLES[0]}, ${REQUIRED_TABLES[1]}, ${REQUIRED_TABLES[2]})
  `

  const indexRows = await db.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        ${REQUIRED_INDEXES[0]},
        ${REQUIRED_INDEXES[1]},
        ${REQUIRED_INDEXES[2]},
        ${REQUIRED_INDEXES[3]},
        ${REQUIRED_INDEXES[4]},
        ${REQUIRED_INDEXES[5]},
        ${REQUIRED_INDEXES[6]},
        ${REQUIRED_INDEXES[7]},
        ${REQUIRED_INDEXES[8]},
        ${REQUIRED_INDEXES[9]},
        ${REQUIRED_INDEXES[10]}
      )
  `

  const foundTables = new Set(tableRows.map((row) => row.table_name))
  const foundIndexes = new Set(indexRows.map((row) => row.indexname))

  const missingTables = REQUIRED_TABLES.filter((name) => !foundTables.has(name))
  const missingIndexes = REQUIRED_INDEXES.filter((name) => !foundIndexes.has(name))

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)

  const adminCount = adminEmails.length
    ? await db.user.count({ where: { email: { in: adminEmails }, role: "ADMIN" } })
    : 0

  const sectorCount = await db.sector.count()

  const report = {
    env: {
      required: REQUIRED_ENV.length,
      missing: missingEnv,
    },
    db: {
      missingTables,
      missingIndexes,
      sectorCount,
      adminCount,
      adminEmailsConfigured: adminEmails,
    },
    checks: {
      envOk: missingEnv.length === 0,
      schemaOk: missingTables.length === 0 && missingIndexes.length === 0,
      seededSectorsOk: sectorCount > 0,
      adminReadyOk: adminCount > 0,
    },
  }

  const passed =
    report.checks.envOk &&
    report.checks.schemaOk &&
    report.checks.seededSectorsOk &&
    report.checks.adminReadyOk

  if (!passed) {
    console.error("Production readiness check failed", report)
    process.exitCode = 1
    return
  }

  console.log("Production readiness check passed", report)
}

main()
  .catch((error) => {
    console.error("Production readiness check crashed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
