/**
 * clear-stale-images.mjs
 * Clears MarketOption records that point to non-existent local files.
 * Run: node scripts/clear-stale-images.mjs
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Clearing stale MANUAL image records...');
  const result = await db.marketOption.deleteMany({
    where: { imageSource: 'MANUAL' }
  });
  console.log(`✅ Deleted ${result.count} stale MANUAL records`);
  console.log('Now run seed-images to re-resolve via Wikimedia API.');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
