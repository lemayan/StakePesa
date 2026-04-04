import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
async function main() {
  const txns = await db.intaSendTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  const wallet = await db.wallet.findFirst({ orderBy: { createdAt: "desc" }})
  const ledger = await db.ledgerEntry.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  
  const output = {
    walletBalanceKES: (wallet?.balance ?? 0) / 100,
    recentTransactions: txns.map(t => ({ status: t.status, type: t.type, amountKES: t.amountCents/100, invoiceId: t.invoiceId, apiRef: t.apiRef.slice(0,8), createdAt: t.createdAt })),
    recentLedger: ledger.map(l => ({ type: l.entryType, amountKES: l.amount/100, balAfterKES: l.balanceAfter/100, desc: l.description?.slice(0,50) }))
  }
  process.stdout.write(JSON.stringify(output, null, 2) + "\n")
  await db.$disconnect()
}
main().catch(async e => { process.stderr.write(e.message + "\n"); await db.$disconnect(); process.exit(1) })
