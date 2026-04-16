import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

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

  const payload = {
    foundTables: [...foundTables].sort(),
    missingTables,
    foundIndexes: [...foundIndexes].sort(),
    missingIndexes,
  }

  if (missingTables.length > 0 || missingIndexes.length > 0) {
    console.error("Admin schema verification failed", payload)
    process.exitCode = 1
    return
  }

  console.log("Admin schema verification passed", payload)
}

main()
  .catch((error) => {
    console.error("Verification script failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
