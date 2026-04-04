import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  const txns = await db.intaSendTransaction.findMany({ orderBy: { createdAt: "asc" } })
  const wallets = await db.wallet.findMany()
  const ledger = await db.ledgerEntry.findMany({ orderBy: { createdAt: "asc" } })

  const result = {
    transactions: txns.map(t => ({
      type: t.type,
      status: t.status,
      amountKES: t.amountCents / 100,
      userId: t.userId,
      apiRef: t.apiRef.slice(0, 12),
      createdAt: t.createdAt,
    })),
    wallets: wallets.map(w => ({
      userId: w.userId,
      balanceKES: w.balance / 100,
    })),
    ledger: ledger.map(l => ({
      entryType: l.entryType,
      amountKES: l.amount / 100,
      balanceAfterKES: l.balanceAfter / 100,
      userId: l.userId,
      description: l.description,
    })),
  }

  process.stdout.write(JSON.stringify(result, null, 2))
  await db.$disconnect()
}

main().catch(async e => { process.stderr.write(String(e)); await db.$disconnect(); process.exit(1) })
