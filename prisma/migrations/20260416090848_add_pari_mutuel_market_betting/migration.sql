-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('OPEN', 'CLOSED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketBetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');

-- CreateTable
CREATE TABLE "MarketPool" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "totalStakeCents" INTEGER NOT NULL DEFAULT 0,
    "betCount" INTEGER NOT NULL DEFAULT 0,
    "status" "MarketStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "winningOutcome" TEXT,
    "houseMarginBps" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketPoolId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "stakeCents" INTEGER NOT NULL,
    "oddsAtPlacement" DOUBLE PRECISION NOT NULL,
    "estimatedReturn" INTEGER NOT NULL,
    "actualReturnCents" INTEGER,
    "status" "MarketBetStatus" NOT NULL DEFAULT 'PENDING',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "MarketBet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketPool_marketId_idx" ON "MarketPool"("marketId");

-- CreateIndex
CREATE INDEX "MarketPool_status_idx" ON "MarketPool"("status");

-- CreateIndex
CREATE INDEX "MarketPool_closesAt_idx" ON "MarketPool"("closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPool_marketId_outcome_key" ON "MarketPool"("marketId", "outcome");

-- CreateIndex
CREATE INDEX "MarketBet_userId_idx" ON "MarketBet"("userId");

-- CreateIndex
CREATE INDEX "MarketBet_marketId_idx" ON "MarketBet"("marketId");

-- CreateIndex
CREATE INDEX "MarketBet_marketPoolId_idx" ON "MarketBet"("marketPoolId");

-- CreateIndex
CREATE INDEX "MarketBet_status_idx" ON "MarketBet"("status");

-- CreateIndex
CREATE INDEX "MarketBet_placedAt_idx" ON "MarketBet"("placedAt");

-- AddForeignKey
ALTER TABLE "MarketBet" ADD CONSTRAINT "MarketBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketBet" ADD CONSTRAINT "MarketBet_marketPoolId_fkey" FOREIGN KEY ("marketPoolId") REFERENCES "MarketPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
