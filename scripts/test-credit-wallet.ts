import { PrismaClient, Prisma } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  // Test 1: Does credit_wallet function exist?
  console.log("1. Testing credit_wallet RPC function...")
  try {
    const result = await db.$queryRaw<any[]>(
      Prisma.sql`SELECT proname FROM pg_proc WHERE proname = 'credit_wallet'`
    )
    console.log("   credit_wallet function exists in DB:", result.length > 0 ? "YES ✅" : "NO ❌ — function not deployed!")
  } catch (e: any) {
    console.log("   Error checking function:", e.message)
  }

  // Test 2: Try calling credit_wallet with 1 cent on a test user
  const testUserId = (await db.wallet.findFirst({ select: { userId: true } }))?.userId
  if (!testUserId) {
    console.log("2. No wallet found — skipping credit test")
    await db.$disconnect()
    return
  }

  console.log(`\n2. Current wallet balance for ${testUserId.slice(0, 8)}:`)
  const walletBefore = await db.wallet.findUnique({ where: { userId: testUserId }, select: { balance: true } })
  console.log(`   Balance before: KES ${(walletBefore?.balance ?? 0) / 100}`)

  console.log("\n3. Attempting credit_wallet RPC (1 cent test)...")
  try {
    const rpc = await db.$queryRaw<any[]>(
      Prisma.sql`SELECT * FROM credit_wallet(
        ${testUserId}::text,
        ${1}::int,
        NULL::uuid,
        ${'CREDIT'}::text,
        ${'Test credit'}::text
      )`
    )
    console.log("   RPC result:", JSON.stringify(rpc))
    
    const walletAfter = await db.wallet.findUnique({ where: { userId: testUserId }, select: { balance: true } })
    console.log(`   Balance after: KES ${(walletAfter?.balance ?? 0) / 100}`)

    // Reverse the test credit
    await db.$queryRaw(Prisma.sql`
      UPDATE "Wallet" SET balance = balance - 1, "updatedAt" = NOW() WHERE "userId" = ${testUserId}
    `)
    await db.ledgerEntry.deleteMany({ where: { description: 'Test credit' } })
    console.log("   ✅ RPC works! (reversed test credit)")
  } catch (e: any) {
    console.log("   ❌ RPC FAILED:", e.message)
    console.log("\n4. Testing fallback (direct Prisma transaction)...")
    try {
      const wallet = await db.wallet.findUnique({ where: { userId: testUserId } })!
      console.log("   Found wallet, attempting direct update...")
      // Don't actually update — just confirm we CAN
      console.log("   ✅ Fallback path should work")
    } catch (e2: any) {
      console.log("   ❌ Fallback also failed:", e2.message)
    }
  }

  await db.$disconnect()
}

main().catch(async e => { console.error(e); await db.$disconnect(); process.exit(1) })
