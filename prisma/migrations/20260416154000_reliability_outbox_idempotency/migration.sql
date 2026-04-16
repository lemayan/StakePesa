CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "IdempotencyRequest" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  "responseJson" JSONB,
  "responseStatus" INT,
  error TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRequest_scope_key_key"
  ON "IdempotencyRequest" (scope, key);

CREATE INDEX IF NOT EXISTS "IdempotencyRequest_status_updatedAt_idx"
  ON "IdempotencyRequest" (status, "updatedAt");

CREATE TABLE IF NOT EXISTS "SettlementOutbox" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
  attempts INT NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lockedAt" TIMESTAMPTZ,
  "lockedBy" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SettlementOutbox_eventKey_key"
  ON "SettlementOutbox" ("eventKey");

CREATE INDEX IF NOT EXISTS "SettlementOutbox_status_availableAt_createdAt_idx"
  ON "SettlementOutbox" (status, "availableAt", "createdAt");
