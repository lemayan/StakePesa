import { db } from "@/lib/db"
import { LedgerEntryType, Prisma } from "@prisma/client"

// ──────────────────────────────────────────────
// WALLET SERVICE
// Calls atomic Postgres RPC functions via $queryRaw.
// All functions use SELECT ... FOR UPDATE row locking.
// ──────────────────────────────────────────────

export interface WalletMutationResult {
    newBalance: number
    ledgerEntryId: string
}

function isMissingRpcFunctionError(error: unknown, functionName: string): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes(`function ${functionName}`) && message.includes("does not exist")
}

async function creditWalletFallback(
    userId: string,
    amountCents: number,
    transactionId?: string,
    entryType: string = "CREDIT",
    description?: string
): Promise<WalletMutationResult> {
    const safeAmount = Math.trunc(amountCents)
    const safeEntryType = entryType as LedgerEntryType
    if (safeAmount <= 0) {
        throw new Error(`Credit amount must be positive. Got: ${safeAmount}`)
    }

    return db.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, balance: 0 },
        })

        await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: safeAmount } },
        })

        const updatedWallet = await tx.wallet.findUnique({
            where: { id: wallet.id },
            select: { balance: true },
        })
        const newBalance = updatedWallet?.balance ?? 0

        const ledger = await tx.ledgerEntry.create({
            data: {
                userId,
                walletId: wallet.id,
                transactionId,
                entryType: safeEntryType,
                amount: safeAmount,
                balanceAfter: newBalance,
                description,
            },
        })

        return { newBalance, ledgerEntryId: ledger.id }
    })
}

async function debitWalletFallback(
    userId: string,
    amountCents: number,
    transactionId?: string,
    entryType: string = "DEBIT",
    description?: string
): Promise<WalletMutationResult> {
    const safeAmount = Math.trunc(amountCents)
    const safeEntryType = entryType as LedgerEntryType
    if (safeAmount <= 0) {
        throw new Error(`Debit amount must be positive. Got: ${safeAmount}`)
    }

    return db.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, balance: 0 },
        })

        const debitResult = await tx.wallet.updateMany({
            where: {
                id: wallet.id,
                balance: { gte: safeAmount },
            },
            data: {
                balance: { decrement: safeAmount },
            },
        })

        if (debitResult.count === 0) {
            const latest = await tx.wallet.findUnique({
                where: { id: wallet.id },
                select: { balance: true },
            })
            throw new Error(`Insufficient funds. Balance: ${latest?.balance ?? 0}, Requested: ${safeAmount}`)
        }

        const updatedWallet = await tx.wallet.findUnique({
            where: { id: wallet.id },
            select: { balance: true },
        })
        const newBalance = updatedWallet?.balance ?? 0

        const ledger = await tx.ledgerEntry.create({
            data: {
                userId,
                walletId: wallet.id,
                transactionId,
                entryType: safeEntryType,
                amount: safeAmount,
                balanceAfter: newBalance,
                description,
            },
        })

        return { newBalance, ledgerEntryId: ledger.id }
    })
}

/**
 * Credits a user's wallet atomically.
 * Uses a Prisma transaction with row-level locking — no custom SQL functions needed.
 */
export async function creditWallet(
    userId: string,
    amountCents: number,
    transactionId?: string,
    entryType: string = "CREDIT",
    description?: string
): Promise<WalletMutationResult> {
    const safeAmount = Math.trunc(amountCents)
    try {
        const result = await db.$queryRaw<
            { new_balance: number; ledger_entry_id: string }[]
        >(
            Prisma.sql`SELECT * FROM credit_wallet(
        ${userId},
        ${safeAmount},
        ${transactionId ? Prisma.sql`${transactionId}::uuid` : Prisma.sql`NULL`},
        ${entryType},
        ${description ?? null}
      )`
        )

        if (!result || result.length === 0) {
            throw new Error(`credit_wallet returned no result for user ${userId}`)
        }

        return {
            newBalance: result[0].new_balance,
            ledgerEntryId: result[0].ledger_entry_id,
        }
    } catch (error: unknown) {
        if (isMissingRpcFunctionError(error, "credit_wallet")) {
            return creditWalletFallback(userId, safeAmount, transactionId, entryType, description)
        }
        throw error
    }
}

/**
 * Debits a user's wallet atomically.
 * Uses a Prisma transaction with row-level locking — no custom SQL functions needed.
 * Raises an error if insufficient funds.
 */
export async function debitWallet(
    userId: string,
    amountCents: number,
    transactionId?: string,
    entryType: string = "DEBIT",
    description?: string
): Promise<WalletMutationResult> {
    const safeAmount = Math.trunc(amountCents)
    try {
        const result = await db.$queryRaw<
            { new_balance: number; ledger_entry_id: string }[]
        >(
            Prisma.sql`SELECT * FROM debit_wallet(
        ${userId},
        ${safeAmount},
        ${transactionId ? Prisma.sql`${transactionId}::uuid` : Prisma.sql`NULL`},
        ${entryType},
        ${description ?? null}
      )`
        )

        if (!result || result.length === 0) {
            throw new Error(`debit_wallet returned no result for user ${userId}`)
        }

        return {
            newBalance: result[0].new_balance,
            ledgerEntryId: result[0].ledger_entry_id,
        }
    } catch (error: unknown) {
        if (isMissingRpcFunctionError(error, "debit_wallet")) {
            return debitWalletFallback(userId, safeAmount, transactionId, entryType, description)
        }
        throw error
    }
}

export interface EscrowLockResult {
    newBalance: number
    escrowLockId: string
}

/**
 * Locks funds from a user's wallet into escrow for a challenge.
 * Atomic: debits wallet + creates escrow lock + ledger entry in one operation.
 */
export async function lockEscrow(
    userId: string,
    challengeId: string,
    amountCents: number,
    transactionId?: string
): Promise<EscrowLockResult> {
    const result = await db.$queryRaw<
        { new_balance: number; escrow_lock_id: string }[]
    >(
        Prisma.sql`SELECT * FROM lock_escrow(
      ${userId},
      ${challengeId}::uuid,
      ${amountCents},
      ${transactionId ? Prisma.sql`${transactionId}::uuid` : Prisma.sql`NULL`}
    )`
    )

    if (!result || result.length === 0) {
        throw new Error(`lock_escrow returned no result for user ${userId}`)
    }

    return {
        newBalance: result[0].new_balance,
        escrowLockId: result[0].escrow_lock_id,
    }
}

export interface EscrowReleaseResult {
    winnerCredited: number
    feeDeducted: number
}

/**
 * Releases escrowed funds to a winner after challenge completion.
 * Deducts platform fee and credits winner's wallet.
 *
 * @param feeBps - Fee in basis points (300 = 3%, 400 = 4%)
 */
export async function releaseEscrow(
    escrowLockId: string,
    winnerId: string,
    feeBps: number = 300
): Promise<EscrowReleaseResult> {
    const result = await db.$queryRaw<
        { winner_credited: number; fee_deducted: number }[]
    >(
        Prisma.sql`SELECT * FROM release_escrow(
      ${escrowLockId}::uuid,
      ${winnerId},
      ${feeBps}
    )`
    )

    if (!result || result.length === 0) {
        throw new Error(`release_escrow returned no result for lock ${escrowLockId}`)
    }

    return {
        winnerCredited: result[0].winner_credited,
        feeDeducted: result[0].fee_deducted,
    }
}

/**
 * Refunds escrowed funds to the original depositor.
 * Used when a challenge is cancelled.
 */
export async function refundEscrow(escrowLockId: string): Promise<number> {
    const result = await db.$queryRaw<{ refund_escrow: number }[]>(
        Prisma.sql`SELECT refund_escrow(${escrowLockId}::uuid)`
    )

    if (!result || result.length === 0) {
        throw new Error(`refund_escrow returned no result for lock ${escrowLockId}`)
    }

    return result[0].refund_escrow
}

/**
 * Gets the current wallet balance for a user.
 * Returns 0 if no wallet exists yet.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    const wallet = await db.wallet.findUnique({
        where: { userId },
        select: { balance: true },
    })

    return wallet?.balance ?? 0
}

/**
 * Calculates the fee basis points for a user.
 * 300 bps (3%) for verified users, 400 bps (4%) for unverified.
 * Future: volume discounts and loyalty reductions.
 */
export async function calculateFeeBps(userId: string): Promise<number> {
    const profile = await db.paymentProfile.findUnique({
        where: { userId },
        select: { isVerified: true },
    })

    // Base: 3% for verified, 4% for unverified
    const baseFee = profile?.isVerified ? 300 : 400

    // Future hook: reduce based on successful challenge history
    // const completedChallenges = await db.challengeParticipant.count(...)
    // if (completedChallenges >= 10) return Math.max(baseFee - 50, 200)

    return baseFee
}
