import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getOutboxProcessingLeaseSeconds, getSettlementOutboxHealth } from "@/lib/reliability"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
  if (!adminEmails.includes(session.user.email?.toLowerCase() ?? "")) return null

  return session.user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const health = await getSettlementOutboxHealth()
    const leaseSeconds = getOutboxProcessingLeaseSeconds()

    const staleProcessing = await db.$queryRaw<Array<{
      id: string
      eventKey: string
      eventType: string
      aggregateId: string
      attempts: number
      lockedAt: string | null
      lockedBy: string | null
      lockedAgeSeconds: number
    }>>`
      SELECT
        id::text AS id,
        "eventKey"::text AS "eventKey",
        "eventType"::text AS "eventType",
        "aggregateId"::text AS "aggregateId",
        attempts,
        "lockedAt"::text AS "lockedAt",
        "lockedBy"::text AS "lockedBy",
        COALESCE(EXTRACT(EPOCH FROM (NOW() - "lockedAt")), 0)::int AS "lockedAgeSeconds"
      FROM "SettlementOutbox"
      WHERE status = 'PROCESSING'
        AND "lockedAt" IS NOT NULL
        AND "lockedAt" <= NOW() - (${leaseSeconds} * INTERVAL '1 second')
      ORDER BY "lockedAt" ASC
      LIMIT 50`

    return NextResponse.json({
      success: true,
      health,
      staleProcessing,
      checks: {
        leaseSeconds,
        hasStaleProcessing: staleProcessing.length > 0,
      },
    })
  } catch (err) {
    console.error("[ADMIN_OUTBOX_HEALTH]", err)
    return NextResponse.json({ error: "Failed to read outbox health." }, { status: 500 })
  }
}
