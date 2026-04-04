import { PrismaClient, TransactionStatus } from "@prisma/client"
import { creditWallet } from "../src/lib/wallet"

const db = new PrismaClient()

async function main() {
  console.log("🔍 Checking for un-credited deposits...\n")

  const users = await db.wallet.findMany({ select: { userId: true, balance: true } })

  for (const { userId, balance } of users) {
    // Sum of all SUCCESS deposits for this user
    const depositAgg = await db.intaSendTransaction.aggregate({
      where: { userId, type: "DEPOSIT", status: TransactionStatus.SUCCESS },
      _sum: { amountCents: true },
    })
    // Sum of all SUCCESS withdrawals
    const withdrawAgg = await db.intaSendTransaction.aggregate({
      where: { userId, type: "WITHDRAWAL", status: TransactionStatus.SUCCESS },
      _sum: { amountCents: true },
    })

    const totalDeposited = depositAgg._sum.amountCents ?? 0
    const totalWithdrawn = withdrawAgg._sum.amountCents ?? 0
    const expectedBalance = totalDeposited - totalWithdrawn
    const deficit = expectedBalance - balance

    console.log(`👤 User: ${userId}`)
    console.log(`   Total deposited (SUCCESS): KES ${totalDeposited / 100}`)
    console.log(`   Total withdrawn (SUCCESS): KES ${totalWithdrawn / 100}`)
    console.log(`   Expected balance:          KES ${expectedBalance / 100}`)
    console.log(`   Actual wallet balance:     KES ${balance / 100}`)

    if (deficit > 0) {
      console.log(`   ⚠️  Missing KES ${deficit / 100} — crediting now...`)
      const result = await creditWallet(
        userId,
        deficit,
        undefined,
        "CREDIT",
        `Balance repair — missing credit from ${deficit / 100 / 10} deposit(s)`
      )
      console.log(`   ✅ Done! New balance: KES ${result.newBalance / 100}\n`)
    } else if (deficit < 0) {
      console.log(`   ⚠️  Wallet has MORE than expected by KES ${Math.abs(deficit) / 100} — investigate manually\n`)
    } else {
      console.log(`   ✅ Balance correct\n`)
    }
  }

  await db.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
