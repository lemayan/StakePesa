import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

type SeedSector = {
  title: string
  slug: string
  iconName: string
}

const INITIAL_SECTORS: SeedSector[] = [
  { title: "Politics", slug: "politics", iconName: "Landmark" },
  { title: "Sports", slug: "sports", iconName: "Trophy" },
  { title: "Finance", slug: "finance", iconName: "LineChart" },
  { title: "Crypto", slug: "crypto", iconName: "Coins" },
  { title: "Entertainment", slug: "entertainment", iconName: "Clapperboard" },
  { title: "Technology", slug: "technology", iconName: "Cpu" },
]

async function main() {
  const summary = {
    created: 0,
    updated: 0,
    total: INITIAL_SECTORS.length,
  }

  for (const sector of INITIAL_SECTORS) {
    const existing = await db.sector.findUnique({
      where: { slug: sector.slug },
      select: { id: true },
    })

    await db.sector.upsert({
      where: { slug: sector.slug },
      create: sector,
      update: {
        title: sector.title,
        iconName: sector.iconName,
      },
    })

    if (existing) summary.updated += 1
    else summary.created += 1
  }

  console.log("Admin sectors seeded", summary)
}

main()
  .catch((error) => {
    console.error("Failed to seed admin sectors", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
