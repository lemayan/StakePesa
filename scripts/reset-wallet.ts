/**
 * reset-wallet.ts
 * Clears ALL wallet data for a clean slate:
 * - Resets wallet balance to 0
 * - Deletes all ledger entries
 * - Deletes all IntaSend transactions
 * - Deletes all audit logs
 */
import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  console.log("⚠️  Resetting ALL wallet data to zero...\n")

  const [ledger, txns, auditLogs, wallets] = await Promise.all([
    db.ledgerEntry.deleteMany({}),
    db.intaSendTransaction.deleteMany({}),
    db.auditLog.deleteMany({}),
    db.wallet.updateMany({ data: { balance: 0 } }),
  ])

  console.log(`✅ Deleted ${ledger.count} ledger entries`)
  console.log(`✅ Deleted ${txns.count} IntaSend transactions`)
  console.log(`✅ Deleted ${auditLogs.count} audit log entries`)
  console.log(`✅ Reset ${wallets.count} wallet(s) to KES 0`)
  console.log("\n🟢 Clean slate! Wallet is now at KES 0.00")

  await db.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
