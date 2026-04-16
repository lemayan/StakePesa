DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminMarketLifecycleStatus') THEN
    CREATE TYPE "AdminMarketLifecycleStatus" AS ENUM ('OPEN', 'CLOSED', 'RESOLVING', 'SETTLED');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

CREATE TABLE IF NOT EXISTS "Sector" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "iconName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Sector_slug_key" ON "Sector" ("slug");
CREATE INDEX IF NOT EXISTS "Sector_title_idx" ON "Sector" ("title");

CREATE TABLE IF NOT EXISTS "AdminMarket" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "startsAt" TIMESTAMPTZ NOT NULL,
  "closesAt" TIMESTAMPTZ NOT NULL,
  "houseMarginBps" INTEGER NOT NULL DEFAULT 500,
  "trending" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "status" "AdminMarketLifecycleStatus" NOT NULL DEFAULT 'OPEN',
  "sectorId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "winningOutcome" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AdminMarket_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminMarket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminMarket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminMarket_slug_key" ON "AdminMarket" ("slug");
CREATE INDEX IF NOT EXISTS "AdminMarket_sectorId_idx" ON "AdminMarket" ("sectorId");
CREATE INDEX IF NOT EXISTS "AdminMarket_status_idx" ON "AdminMarket" ("status");
CREATE INDEX IF NOT EXISTS "AdminMarket_trending_idx" ON "AdminMarket" ("trending");
CREATE INDEX IF NOT EXISTS "AdminMarket_isActive_idx" ON "AdminMarket" ("isActive");
CREATE INDEX IF NOT EXISTS "AdminMarket_startsAt_idx" ON "AdminMarket" ("startsAt");
CREATE INDEX IF NOT EXISTS "AdminMarket_closesAt_idx" ON "AdminMarket" ("closesAt");

CREATE TABLE IF NOT EXISTS "AdminMarketOutcome" (
  "id" TEXT PRIMARY KEY,
  "marketId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "seedStakeCents" INTEGER NOT NULL DEFAULT 0,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AdminMarketOutcome_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "AdminMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminMarketOutcome_marketId_name_key" ON "AdminMarketOutcome" ("marketId", "name");
CREATE INDEX IF NOT EXISTS "AdminMarketOutcome_marketId_idx" ON "AdminMarketOutcome" ("marketId");
