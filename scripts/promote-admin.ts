import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

function getTargetEmail(): string | null {
  const arg = process.argv[2]?.trim()
  if (arg) return arg

  const fromEnv = process.env.ADMIN_EMAIL?.trim()
  if (fromEnv) return fromEnv

  const firstFromList = process.env.ADMIN_EMAILS?.split(",")[0]?.trim()
  return firstFromList || null
}

async function main() {
  const email = getTargetEmail()
  if (!email) {
    console.error("Missing target email. Usage: npm run admin:promote -- <email> or set ADMIN_EMAIL/ADMIN_EMAILS")
    process.exitCode = 1
    return
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, emailVerified: true },
  })

  if (!existing) {
    console.error(`User not found for email: ${email}`)
    process.exitCode = 1
    return
  }

  if (existing.role === "ADMIN") {
    console.log(`User is already ADMIN: ${email}`)
    return
  }

  const updated = await db.user.update({
    where: { email },
    data: {
      role: "ADMIN",
      emailVerified: existing.emailVerified ?? new Date(),
    },
    select: { id: true, email: true, role: true },
  })

  console.log("Admin promotion successful", updated)
}

main()
  .catch((error) => {
    console.error("Admin promotion failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
