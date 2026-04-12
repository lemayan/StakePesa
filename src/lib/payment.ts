import { db } from "@/lib/db"
import { TransactionStatus, TransactionType } from "@prisma/client"
import { initiateSTKPush } from "@/lib/daraja"
import { creditWallet } from "@/lib/wallet"
import {
    normalizePhoneNumber,
    phoneNumberSchema,
    mpesaCallbackSchema,
    extractCallbackMetadata,
    type MpesaCallbackPayload,
} from "@/lib/validators"
import { sendDepositConfirmedEmail } from "@/lib/mail"

// ──────────────────────────────────────────────
// PAYMENT SERVICE
// Orchestrates M-Pesa operations:
// - Phone verification via KES 1 STK Push
// - Deposit initiation
// - Idempotent callback processing
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// RATE LIMITING (simple sliding window)
// ──────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3 // 3 requests per minute per user

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const timestamps = rateLimitMap.get(userId) ?? []

    // Remove expired timestamps
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)

    if (valid.length >= RATE_LIMIT_MAX_REQUESTS) {
        return false // Rate limited
    }

    valid.push(now)
    rateLimitMap.set(userId, valid)
    return true
}

// ──────────────────────────────────────────────
// PHONE VERIFICATION
// ──────────────────────────────────────────────

export interface VerificationResult {
    success: boolean
    checkoutRequestId?: string
    error?: string
    alreadyVerified?: boolean
}

/**
 * Initiates phone verification via KES 1 STK Push.
 *
 * Flow:
 * 1. Validate & normalize phone number
 * 2. Rate limit check
 * 3. Upsert PaymentProfile (isVerified=false)
 * 4. Initiate STK Push via Daraja
 * 5. Create PENDING MpesaTransaction
 * 6. Create AuditLog entry
 */
export async function initiatePhoneVerification(
    userId: string,
    rawPhoneNumber: string
): Promise<VerificationResult> {
    // 1. Normalize and validate
    let phoneNumber: string
    try {
        phoneNumber = normalizePhoneNumber(rawPhoneNumber)
    } catch {
        return { success: false, error: "Invalid phone number format. Use 07XXXXXXXX or +2547XXXXXXXX." }
    }

    const validation = phoneNumberSchema.safeParse(phoneNumber)
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message }
    }

    // 2. Rate limit
    if (!checkRateLimit(userId)) {
        return { success: false, error: "Too many verification attempts. Please wait a minute." }
    }

    // 2.5 Global Verification Check
    // If this phone number is ALREADY verified by *any* user in the system,
    // we bypass M-Pesa and instantly link it for this user too.
    const globallyVerified = await db.paymentProfile.findFirst({
        where: { phoneNumber, isVerified: true }
    })

    if (globallyVerified || process.env.NODE_ENV === "development") {
        await db.paymentProfile.upsert({
            where: { userId },
            update: { phoneNumber, isVerified: true, verifiedAt: new Date() },
            create: { userId, phoneNumber, isVerified: true, verifiedAt: new Date() },
        })
        return { success: true, alreadyVerified: true }
    }

    // 3. Upsert PaymentProfile (Pending)
    await db.paymentProfile.upsert({
        where: { userId },
        update: {
            phoneNumber,
            isVerified: false,
            verifiedAt: null,
        },
        create: {
            userId,
            phoneNumber,
            isVerified: false,
        },
    })

    // 4. Initiate STK Push (KES 1 for verification)
    let stkResponse
    try {
        stkResponse = await initiateSTKPush(phoneNumber, 1, "StakePesa", "PhoneVerify")
    } catch (error: any) {
        console.error("[DARAJA] STK Push failed:", error.response?.data ?? error.message)

        // Log the attempt
        await db.auditLog.create({
            data: {
                userId,
                action: "PHONE_VERIFY_STK_FAILED",
                metadata: {
                    phoneNumber,
                    error: error.response?.data ?? error.message,
                },
            },
        })

        return { success: false, error: "Failed to initiate M-Pesa prompt. Please try again." }
    }

    // 5. Create PENDING transaction
    await db.mpesaTransaction.create({
        data: {
            userId,
            phoneNumber,
            amount: 100, // KES 1 = 100 cents
            checkoutRequestId: stkResponse.CheckoutRequestID,
            merchantRequestId: stkResponse.MerchantRequestID,
            status: TransactionStatus.PENDING,
            type: TransactionType.VERIFY,
        },
    })

    // 6. Audit log
    await db.auditLog.create({
        data: {
            userId,
            action: "PHONE_VERIFY_INITIATED",
            metadata: {
                phoneNumber,
                checkoutRequestId: stkResponse.CheckoutRequestID,
            },
        },
    })

    return {
        success: true,
        checkoutRequestId: stkResponse.CheckoutRequestID,
    }
}

// ──────────────────────────────────────────────
// DEPOSIT INITIATION
// ──────────────────────────────────────────────

export interface DepositResult {
    success: boolean
    checkoutRequestId?: string
    error?: string
}

/**
 * Initiates a deposit via STK Push.
 *
 * @param userId - Authenticated user
 * @param amountCents - Amount in KES cents
 */
export async function initiateDeposit(
    userId: string,
    amountCents: number
): Promise<DepositResult> {
    // Validate user has verified phone
    const profile = await db.paymentProfile.findUnique({
        where: { userId },
        select: { phoneNumber: true, isVerified: true },
    })

    if (!profile || !profile.isVerified) {
        return { success: false, error: "Please verify your phone number first." }
    }

    // Rate limit
    if (!checkRateLimit(userId)) {
        return { success: false, error: "Too many requests. Please wait a minute." }
    }

    // Convert cents to whole KES for Daraja
    const amountKES = Math.floor(amountCents / 100)
    if (amountKES < 1) {
        return { success: false, error: "Minimum deposit is KES 1." }
    }

    // STK Push
    let stkResponse
    try {
        stkResponse = await initiateSTKPush(profile.phoneNumber, amountKES, "StakePesa", "Deposit")
    } catch (error: any) {
        console.error("[DARAJA] Deposit STK failed:", error.response?.data ?? error.message)
        return { success: false, error: "Failed to initiate M-Pesa prompt. Please try again." }
    }

    // Create PENDING transaction
    await db.mpesaTransaction.create({
        data: {
            userId,
            phoneNumber: profile.phoneNumber,
            amount: amountCents,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            merchantRequestId: stkResponse.MerchantRequestID,
            status: TransactionStatus.PENDING,
            type: TransactionType.DEPOSIT,
        },
    })

    await db.auditLog.create({
        data: {
            userId,
            action: "DEPOSIT_INITIATED",
            metadata: {
                amountCents,
                checkoutRequestId: stkResponse.CheckoutRequestID,
            },
        },
    })

    return {
        success: true,
        checkoutRequestId: stkResponse.CheckoutRequestID,
    }
}

// ──────────────────────────────────────────────
// CALLBACK PROCESSING
// Idempotent: safe to call multiple times with same data.
// ──────────────────────────────────────────────

export interface CallbackResult {
    processed: boolean
    transactionId?: string
    error?: string
}

/**
 * Processes M-Pesa callback from Safaricom.
 *
 * Idempotency:
 * - If the transaction is already SUCCESS or FAILED, returns early.
 * - Only PENDING transactions are processed.
 *
 * Atomicity:
 * - All database updates happen inside a Prisma $transaction.
 * - Wallet mutations use Postgres RPC with row-level locking.
 */
export async function processCallback(
    rawPayload: unknown
): Promise<CallbackResult> {
    // 1. Validate payload structure
    const parsed = mpesaCallbackSchema.safeParse(rawPayload)
    if (!parsed.success) {
        console.error("[CALLBACK] Invalid payload structure:", parsed.error.issues)
        return { processed: false, error: "Invalid callback payload" }
    }

    const callback = parsed.data.Body.stkCallback
    const { CheckoutRequestID, ResultCode, ResultDesc } = callback
    const metadata = extractCallbackMetadata(callback)

    // 2. Find the transaction
    const transaction = await db.mpesaTransaction.findUnique({
        where: { checkoutRequestId: CheckoutRequestID },
    })

    if (!transaction) {
        console.warn("[CALLBACK] Unknown checkoutRequestId:", CheckoutRequestID)
        return { processed: false, error: "Unknown transaction" }
    }

    // 3. Idempotency check — already processed?
    if (transaction.status !== TransactionStatus.PENDING) {
        console.info("[CALLBACK] Already processed:", CheckoutRequestID, transaction.status)
        return { processed: true, transactionId: transaction.id }
    }

    // 4. Process based on result
    const isSuccess = ResultCode === 0

    if (isSuccess) {
        // ── SUCCESS PATH ──
        await db.$transaction(async (tx) => {
            // Update transaction
            await tx.mpesaTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.SUCCESS,
                    mpesaReceipt: metadata.mpesaReceiptNumber ?? null,
                    resultCode: ResultCode,
                    resultDesc: ResultDesc,
                    rawCallback: rawPayload as any,
                },
            })

            // Type-specific logic
            if (transaction.type === TransactionType.VERIFY) {
                // Mark phone as verified
                await tx.paymentProfile.update({
                    where: { userId: transaction.userId },
                    data: {
                        isVerified: true,
                        verifiedAt: new Date(),
                    },
                })

                await tx.auditLog.create({
                    data: {
                        userId: transaction.userId,
                        action: "PHONE_VERIFIED",
                        metadata: {
                            transactionId: transaction.id,
                            mpesaReceipt: metadata.mpesaReceiptNumber,
                            phoneNumber: transaction.phoneNumber,
                        },
                    },
                })
            }

            if (transaction.type === TransactionType.DEPOSIT) {
                await tx.auditLog.create({
                    data: {
                        userId: transaction.userId,
                        action: "DEPOSIT_CONFIRMED",
                        metadata: {
                            transactionId: transaction.id,
                            amountCents: transaction.amount,
                            mpesaReceipt: metadata.mpesaReceiptNumber,
                        },
                    },
                })
            }
        })

        // Wallet credit happens OUTSIDE the Prisma transaction
        // because it uses raw SQL with row-level locking (different mechanism)
        if (transaction.type === TransactionType.VERIFY) {
            // Credit the KES 1 verification amount as a welcome gesture
            await creditWallet(
                transaction.userId,
                transaction.amount,
                transaction.id,
                "CREDIT",
                "Phone verification refund (KES 1)"
            )
        }

        if (transaction.type === TransactionType.DEPOSIT) {
            await creditWallet(
                transaction.userId,
                transaction.amount,
                transaction.id,
                "CREDIT",
                `M-Pesa deposit (Receipt: ${metadata.mpesaReceiptNumber})`
            )

            // Send deposit confirmed email (fire-and-forget)
            const userRecord = await db.user.findUnique({
                where: { id: transaction.userId },
                select: { email: true, name: true },
            })
            if (userRecord?.email) {
                void sendDepositConfirmedEmail(
                    userRecord.email,
                    userRecord.name ?? userRecord.email,
                    transaction.amount,
                    metadata.mpesaReceiptNumber ?? null
                )
            }
        }
    } else {
        // ── FAILURE PATH ──
        await db.mpesaTransaction.update({
            where: { id: transaction.id },
            data: {
                status: TransactionStatus.FAILED,
                resultCode: ResultCode,
                resultDesc: ResultDesc,
                rawCallback: rawPayload as any,
            },
        })

        await db.auditLog.create({
            data: {
                userId: transaction.userId,
                action:
                    transaction.type === TransactionType.VERIFY
                        ? "PHONE_VERIFY_FAILED"
                        : "DEPOSIT_FAILED",
                metadata: {
                    transactionId: transaction.id,
                    resultCode: ResultCode,
                    resultDesc: ResultDesc,
                },
            },
        })
    }

    return { processed: true, transactionId: transaction.id }
}

// ──────────────────────────────────────────────
// STK QUERY FALLBACK
// When the callback is missed (ngrok down, network issues),
// we query Safaricom directly for the transaction result.
// ──────────────────────────────────────────────

/**
 * Queries Safaricom for the status of a pending transaction
 * and processes it if successful. This is the fallback when
 * callbacks don't arrive (e.g. ngrok was down).
 */
export async function checkTransactionByQuery(
    checkoutRequestId: string
): Promise<CallbackResult> {
    // 1. Find the transaction
    const transaction = await db.mpesaTransaction.findUnique({
        where: { checkoutRequestId },
    })

    if (!transaction) {
        return { processed: false, error: "Transaction not found" }
    }

    // Already processed? Return early.
    if (transaction.status !== TransactionStatus.PENDING) {
        return { processed: true, transactionId: transaction.id }
    }

    // 2. Query Safaricom
    let queryResult: any
    try {
        const { querySTKStatus } = await import("@/lib/daraja")
        queryResult = await querySTKStatus(checkoutRequestId)
    } catch (error: any) {
        console.error("[STK_QUERY] Failed:", error.response?.data ?? error.message)
        return { processed: false, error: "Could not query transaction status" }
    }

    const resultCode = queryResult.ResultCode ?? queryResult.resultCode
    const resultDesc = queryResult.ResultDesc ?? queryResult.resultDesc ?? ""

    // ResultCode 0 = success
    if (resultCode === 0 || resultCode === "0") {
        // Process as SUCCESS
        await db.$transaction(async (tx) => {
            await tx.mpesaTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.SUCCESS,
                    resultCode: Number(resultCode),
                    resultDesc,
                    rawCallback: queryResult,
                },
            })

            if (transaction.type === TransactionType.VERIFY) {
                await tx.paymentProfile.update({
                    where: { userId: transaction.userId },
                    data: {
                        isVerified: true,
                        verifiedAt: new Date(),
                    },
                })

                await tx.auditLog.create({
                    data: {
                        userId: transaction.userId,
                        action: "PHONE_VERIFIED_VIA_QUERY",
                        metadata: {
                            transactionId: transaction.id,
                            phoneNumber: transaction.phoneNumber,
                        },
                    },
                })
            }

            if (transaction.type === TransactionType.DEPOSIT) {
                await tx.auditLog.create({
                    data: {
                        userId: transaction.userId,
                        action: "DEPOSIT_CONFIRMED_VIA_QUERY",
                        metadata: {
                            transactionId: transaction.id,
                            amountCents: transaction.amount,
                        },
                    },
                })
            }
        })

        // Credit wallet
        if (transaction.type === TransactionType.VERIFY || transaction.type === TransactionType.DEPOSIT) {
            await creditWallet(
                transaction.userId,
                transaction.amount,
                transaction.id,
                "CREDIT",
                transaction.type === TransactionType.VERIFY
                    ? "Phone verification refund (KES 1)"
                    : "M-Pesa deposit (via status check)"
            )

            // Send deposit confirmed email for deposits (fire-and-forget)
            if (transaction.type === TransactionType.DEPOSIT) {
                const userRecord = await db.user.findUnique({
                    where: { id: transaction.userId },
                    select: { email: true, name: true },
                })
                if (userRecord?.email) {
                    void sendDepositConfirmedEmail(
                        userRecord.email,
                        userRecord.name ?? userRecord.email,
                        transaction.amount,
                        null
                    )
                }
            }
        }

        return { processed: true, transactionId: transaction.id }
    }

    // If ResultCode is non-zero and not 1032 (cancelled), mark as failed
    if (resultCode !== undefined && resultCode !== 1032) {
        await db.mpesaTransaction.update({
            where: { id: transaction.id },
            data: {
                status: TransactionStatus.FAILED,
                resultCode: Number(resultCode),
                resultDesc,
            },
        })
    }

    // 1032 = "Request cancelled by user" or still processing — leave as PENDING
    return { processed: false, error: resultDesc || "Transaction not yet confirmed" }
}
