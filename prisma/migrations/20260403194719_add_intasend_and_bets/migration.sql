-- CreateEnum
CREATE TYPE "IntaSendTxType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'REFUNDED');

-- CreateTable
CREATE TABLE "IntaSendTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiRef" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "IntaSendTxType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL,
    "rawWebhook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntaSendTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "escrowLockId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "stakeKES" INTEGER NOT NULL,
    "payoutKES" INTEGER,
    "status" "BetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntaSendTransaction_apiRef_key" ON "IntaSendTransaction"("apiRef");

-- CreateIndex
CREATE INDEX "IntaSendTransaction_userId_idx" ON "IntaSendTransaction"("userId");

-- CreateIndex
CREATE INDEX "IntaSendTransaction_apiRef_idx" ON "IntaSendTransaction"("apiRef");

-- CreateIndex
CREATE INDEX "IntaSendTransaction_status_idx" ON "IntaSendTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BetParticipant_escrowLockId_key" ON "BetParticipant"("escrowLockId");

-- CreateIndex
CREATE INDEX "BetParticipant_userId_idx" ON "BetParticipant"("userId");

-- CreateIndex
CREATE INDEX "BetParticipant_marketId_idx" ON "BetParticipant"("marketId");

-- CreateIndex
CREATE INDEX "BetParticipant_status_idx" ON "BetParticipant"("status");

-- AddForeignKey
ALTER TABLE "IntaSendTransaction" ADD CONSTRAINT "IntaSendTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetParticipant" ADD CONSTRAINT "BetParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
