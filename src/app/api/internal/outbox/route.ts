import { NextResponse } from "next/server"
import { z } from "zod"
import {
  claimSettlementOutboxBatch,
  getSettlementOutboxHealth,
  markSettlementOutboxFailed,
  markSettlementOutboxProcessed,
  reclaimStaleSettlementOutboxLocks,
} from "@/lib/reliability"

function isAuthorized(request: Request): boolean {
  const secret = process.env.OUTBOX_WORKER_SECRET
  if (!secret) return false

  const header = request.headers.get("x-outbox-secret")
  return header === secret
}

const claimSchema = z.object({
  action: z.literal("claim"),
  workerId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
})

const ackSchema = z.object({
  action: z.literal("ack"),
  id: z.string().uuid(),
  outcome: z.enum(["processed", "failed"]),
  error: z.string().max(1000).optional(),
  retryDelaySeconds: z.number().int().min(1).max(3600).optional(),
})

const schema = z.discriminatedUnion("action", [claimSchema, ackSchema])

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 }
    )
  }

  const data = parsed.data

  try {
    if (data.action === "claim") {
      const reclaimed = await reclaimStaleSettlementOutboxLocks()
      const events = await claimSettlementOutboxBatch(data.workerId, data.limit ?? 10)
      const health = await getSettlementOutboxHealth()
      return NextResponse.json({
        success: true,
        events,
        count: events.length,
        reclaimedStaleLocks: reclaimed,
        health,
      })
    }

    if (data.outcome === "processed") {
      await markSettlementOutboxProcessed(data.id)
      return NextResponse.json({ success: true })
    }

    await markSettlementOutboxFailed(
      data.id,
      data.error ?? "Worker reported failure",
      data.retryDelaySeconds ?? 30
    )
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
