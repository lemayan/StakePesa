import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export type IdempotencyClaimResult =
  | { kind: "claimed"; id: string }
  | { kind: "completed"; responseStatus: number; responseBody: unknown }
  | { kind: "in-progress" }
  | { kind: "mismatch" }

export async function claimIdempotencyKey(
  scope: string,
  key: string,
  requestHash: string
): Promise<IdempotencyClaimResult> {
  const inserted = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`INSERT INTO "IdempotencyRequest" (
      scope,
      key,
      "requestHash",
      status,
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${scope},
      ${key},
      ${requestHash},
      'IN_PROGRESS',
      NOW(),
      NOW()
    )
    ON CONFLICT (scope, key) DO NOTHING
    RETURNING id`
  )

  if (inserted.length > 0) {
    return { kind: "claimed", id: inserted[0].id }
  }

  const rows = await db.$queryRaw<{
    requestHash: string
    status: string
    responseStatus: number | null
    responseJson: unknown
  }[]>(
    Prisma.sql`SELECT
      "requestHash" AS "requestHash",
      status,
      "responseStatus" AS "responseStatus",
      "responseJson" AS "responseJson"
    FROM "IdempotencyRequest"
    WHERE scope = ${scope} AND key = ${key}
    LIMIT 1`
  )

  if (rows.length === 0) {
    return { kind: "in-progress" }
  }

  const existing = rows[0]
  if (existing.requestHash !== requestHash) {
    return { kind: "mismatch" }
  }

  if (existing.status === "COMPLETED") {
    return {
      kind: "completed",
      responseStatus: existing.responseStatus ?? 200,
      responseBody: existing.responseJson,
    }
  }

  return { kind: "in-progress" }
}

export async function completeIdempotencyKey(
  id: string,
  responseStatus: number,
  responseBody: unknown
): Promise<void> {
  await db.$executeRaw(
    Prisma.sql`UPDATE "IdempotencyRequest"
    SET
      status = 'COMPLETED',
      "responseStatus" = ${responseStatus},
      "responseJson" = ${JSON.stringify(responseBody)}::jsonb,
      error = NULL,
      "completedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${id}::uuid`
  )
}

export async function failIdempotencyKey(id: string, message: string): Promise<void> {
  await db.$executeRaw(
    Prisma.sql`UPDATE "IdempotencyRequest"
    SET
      status = 'FAILED',
      error = ${message},
      "updatedAt" = NOW()
    WHERE id = ${id}::uuid`
  )
}

export interface SettlementOutboxEvent {
  eventKey: string
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: unknown
}

export interface ClaimedOutboxEvent {
  id: string
  eventKey: string
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: unknown
  attempts: number
  createdAt: string
}

export interface SettlementOutboxHealth {
  now: string
  leaseSeconds: number
  pendingCount: number
  processingCount: number
  failedCount: number
  processedCount: number
  staleProcessingCount: number
  oldestPendingAgeSeconds: number
  oldestProcessingAgeSeconds: number
}

const DEFAULT_OUTBOX_PROCESSING_LEASE_SECONDS = 300

export function getOutboxProcessingLeaseSeconds(): number {
  const raw = Number(process.env.OUTBOX_PROCESSING_LEASE_SECONDS)
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_OUTBOX_PROCESSING_LEASE_SECONDS
  }
  return Math.max(15, Math.min(Math.trunc(raw), 3600))
}

export async function enqueueSettlementOutboxEventTx(
  tx: Prisma.TransactionClient,
  event: SettlementOutboxEvent
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO "SettlementOutbox" (
      "eventKey",
      "eventType",
      "aggregateType",
      "aggregateId",
      payload,
      status,
      attempts,
      "availableAt",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${event.eventKey},
      ${event.eventType},
      ${event.aggregateType},
      ${event.aggregateId},
      ${JSON.stringify(event.payload)}::jsonb,
      'PENDING',
      0,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT ("eventKey") DO NOTHING`
  )
}

export async function claimSettlementOutboxBatch(
  workerId: string,
  limit = 10
): Promise<ClaimedOutboxEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100))

  return db.$queryRaw<ClaimedOutboxEvent[]>(
    Prisma.sql`WITH picked AS (
      SELECT id
      FROM "SettlementOutbox"
      WHERE status = 'PENDING'
        AND "availableAt" <= NOW()
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${safeLimit}
    )
    UPDATE "SettlementOutbox" o
    SET
      status = 'PROCESSING',
      attempts = o.attempts + 1,
      "lockedAt" = NOW(),
      "lockedBy" = ${workerId},
      "updatedAt" = NOW()
    FROM picked
    WHERE o.id = picked.id
    RETURNING
      o.id::text,
      o."eventKey"::text,
      o."eventType"::text,
      o."aggregateType"::text,
      o."aggregateId"::text,
      o.payload,
      o.attempts,
      o."createdAt"::text`
  )
}

export async function reclaimStaleSettlementOutboxLocks(): Promise<number> {
  const leaseSeconds = getOutboxProcessingLeaseSeconds()

  const reclaimed = await db.$executeRaw(
    Prisma.sql`UPDATE "SettlementOutbox"
    SET
      status = 'PENDING',
      "lockedAt" = NULL,
      "lockedBy" = NULL,
      "lastError" = COALESCE("lastError", 'Worker lease expired; reclaimed for retry'),
      "availableAt" = NOW(),
      "updatedAt" = NOW()
    WHERE status = 'PROCESSING'
      AND "lockedAt" IS NOT NULL
      AND "lockedAt" <= NOW() - (${leaseSeconds} * INTERVAL '1 second')`
  )

  return Number(reclaimed) || 0
}

export async function getSettlementOutboxHealth(): Promise<SettlementOutboxHealth> {
  const leaseSeconds = getOutboxProcessingLeaseSeconds()

  const rows = await db.$queryRaw<Array<{
    now: string
    pendingCount: number
    processingCount: number
    failedCount: number
    processedCount: number
    staleProcessingCount: number
    oldestPendingAgeSeconds: number
    oldestProcessingAgeSeconds: number
  }>>(
    Prisma.sql`SELECT
      NOW()::text AS now,
      COALESCE(COUNT(*) FILTER (WHERE status = 'PENDING'), 0)::int AS "pendingCount",
      COALESCE(COUNT(*) FILTER (WHERE status = 'PROCESSING'), 0)::int AS "processingCount",
      COALESCE(COUNT(*) FILTER (WHERE status = 'FAILED'), 0)::int AS "failedCount",
      COALESCE(COUNT(*) FILTER (WHERE status = 'PROCESSED'), 0)::int AS "processedCount",
      COALESCE(COUNT(*) FILTER (
        WHERE status = 'PROCESSING'
          AND "lockedAt" IS NOT NULL
          AND "lockedAt" <= NOW() - (${leaseSeconds} * INTERVAL '1 second')
      ), 0)::int AS "staleProcessingCount",
      COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - "createdAt"))) FILTER (WHERE status = 'PENDING'), 0)::int AS "oldestPendingAgeSeconds",
      COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - COALESCE("lockedAt", "updatedAt")))) FILTER (WHERE status = 'PROCESSING'), 0)::int AS "oldestProcessingAgeSeconds"
    FROM "SettlementOutbox"`
  )

  const row = rows[0]
  return {
    now: row?.now ?? new Date().toISOString(),
    leaseSeconds,
    pendingCount: row?.pendingCount ?? 0,
    processingCount: row?.processingCount ?? 0,
    failedCount: row?.failedCount ?? 0,
    processedCount: row?.processedCount ?? 0,
    staleProcessingCount: row?.staleProcessingCount ?? 0,
    oldestPendingAgeSeconds: row?.oldestPendingAgeSeconds ?? 0,
    oldestProcessingAgeSeconds: row?.oldestProcessingAgeSeconds ?? 0,
  }
}

export async function markSettlementOutboxProcessed(id: string): Promise<void> {
  await db.$executeRaw(
    Prisma.sql`UPDATE "SettlementOutbox"
    SET
      status = 'PROCESSED',
      "lockedAt" = NULL,
      "lockedBy" = NULL,
      "lastError" = NULL,
      "updatedAt" = NOW()
    WHERE id = ${id}::uuid`
  )
}

export async function markSettlementOutboxFailed(
  id: string,
  error: string,
  retryDelaySeconds = 30
): Promise<void> {
  const safeDelay = Math.max(1, Math.min(retryDelaySeconds, 3600))

  await db.$executeRaw(
    Prisma.sql`UPDATE "SettlementOutbox"
    SET
      status = 'PENDING',
      "lockedAt" = NULL,
      "lockedBy" = NULL,
      "lastError" = ${error},
      "availableAt" = NOW() + (${safeDelay} * INTERVAL '1 second'),
      "updatedAt" = NOW()
    WHERE id = ${id}::uuid`
  )
}
