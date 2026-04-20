CREATE TABLE IF NOT EXISTS "MarketComment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "marketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  body TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "MarketComment_marketId_createdAt_idx"
  ON "MarketComment" ("marketId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "MarketComment_userId_idx"
  ON "MarketComment" ("userId");

ALTER TABLE "MarketComment"
  ADD CONSTRAINT "MarketComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
