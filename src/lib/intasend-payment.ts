import { db } from "@/lib/db"
import { TransactionStatus } from "@prisma/client"
import { initiateSTKPush, initiatePayoutToMpesa, normalisePhone } from "@/lib/intasend"
import { creditWallet, debitWallet } from "@/lib/wallet"
import { randomUUID } from "crypto"

// ──────────────────────────────────────────────
// INTASEND PAYMENT SERVICE
// Orchestrates deposit, withdrawal, and webhook processing.
// Mirror of payment.ts but for IntaSend instead of Daraja.
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// DEPOSIT
// ──────────────────────────────────────────────

export interface DepositResult {
    success: boolean
    invoiceId?: string   // IntaSend invoice ID for polling
    apiRef?: string      // our internal ref for webhook matching
    error?: string
}

/**
 * Initiates an M-Pesa deposit via IntaSend STK Push.
 * Creates a PENDING IntaSendTransaction for idempotent webhook processing.
 *
 * @param userId - Authenticated user ID
 * @param amountKES - Amount in whole KES (NOT cents)
 * @param userName - User's display name (shown on M-Pesa prompt)
 * @param rawPhone - Phone number in any Kenyan format
 */
export async function initiateDeposit(
    userId: string,
    amountKES: number,
    userName: string,
    rawPhone: string
): Promise<DepositResult> {

    if (amountKES < 10) {
        return { success: false, error: "Minimum deposit is KES 10." }
    }
    if (amountKES > 250_000) {
        return { success: false, error: "Maximum single deposit is KES 250,000." }
    }

    let phone: string
    try {
        phone = normalisePhone(rawPhone)
    } catch {
        return { success: false, error: "Invalid phone number. Use 07XXXXXXXX or +2547XXXXXXXX." }
    }

    // Generate a unique reference — this is how we match the webhook back
    const apiRef = randomUUID()

    // Create PENDING record BEFORE calling IntaSend
    // (If IntaSend call fails, we have nothing in DB — clean state)
    let invoiceId: string
    try {
        const stkResult = await initiateSTKPush(phone, amountKES, apiRef, userName.split(" ")[0])
        invoiceId = stkResult.invoice.invoice_id

        await db.intaSendTransaction.create({
            data: {
                userId,
                apiRef,
                invoiceId,
                type: "DEPOSIT",
                amountCents: amountKES * 100,
                status: TransactionStatus.PENDING,
                phone,
            },
        })

        await db.auditLog.create({
            data: {
                userId,
                action: "DEPOSIT_INITIATED",
                metadata: { amountKES, apiRef, invoiceId, phone },
            },
        })

        return { success: true, invoiceId, apiRef }

    } catch (error: any) {
        console.error("[INTASEND] STK Push failed:", error?.message ?? error)
        return { success: false, error: "Failed to initiate M-Pesa prompt. Please try again." }
    }
}

// ──────────────────────────────────────────────
// WEBHOOK PROCESSOR
// Idempotent — safe to receive the same webhook twice.
// Handles both DEPOSIT confirmations and WITHDRAWAL results.
// ──────────────────────────────────────────────

export interface WebhookResult {
    processed: boolean
    type?: "DEPOSIT" | "WITHDRAWAL"
    error?: string
}

/**
 * IntaSend webhook payload shape (simplified).
 * IntaSend sends state: "COMPLETE" | "FAILED" | "PENDING"
 */
interface IntaSendWebhookPayload {
    invoice_id?: string
    api_ref?: string
    state?: string          // "COMPLETE" | "FAILED" | "PENDING" | "PROCESSING"
    value?: number          // actual amount paid in KES
    currency?: string
    failed_reason?: string
    // Payout-specific
    id?: string             // payout batch ID
    transactions?: Array<{
        request_reference_id?: string
        status?: string
    }>
}

/**
 * Processes an IntaSend webhook.
 * Looks up the transaction by api_ref, then credits/debits wallet accordingly.
 */
export async function processIntaSendWebhook(
    payload: IntaSendWebhookPayload
): Promise<WebhookResult> {

    const apiRef = payload.api_ref
    const invoiceId = payload.invoice_id
    const state = payload.state?.toUpperCase()

    console.info("[WEBHOOK] Processing:", { apiRef, invoiceId, state })

    if (!apiRef && !invoiceId) {
        // Might be a payout webhook — handle separately
        if (payload.id && payload.transactions) {
            return processPayoutWebhook(payload)
        }
        return { processed: false, error: "No api_ref or invoice_id in payload" }
    }

    // Find the pending transaction — try api_ref first, then invoice_id
    let txn = apiRef
        ? await db.intaSendTransaction.findUnique({ where: { apiRef } })
        : null

    if (!txn && invoiceId) {
        txn = await db.intaSendTransaction.findFirst({
            where: { invoiceId },
        })
    }

    if (!txn) {
        console.warn("[WEBHOOK] Unknown transaction — apiRef:", apiRef, "invoiceId:", invoiceId)
        return { processed: false, error: "Unknown transaction" }
    }

    // Idempotency — already processed?
    if (txn.status !== TransactionStatus.PENDING) {
        console.info("[WEBHOOK] Already processed:", txn.id, txn.status)
        return { processed: true, type: txn.type as "DEPOSIT" | "WITHDRAWAL" }
    }

    if (state === "COMPLETE") {
        // ── SUCCESS PATH ──
        await db.$transaction(async (tx) => {
            await tx.intaSendTransaction.update({
                where: { id: txn!.id },
                data: {
                    status: TransactionStatus.SUCCESS,
                    rawWebhook: payload as any,
                    ...(invoiceId && !txn!.invoiceId ? { invoiceId } : {}),
                },
            })

            await tx.auditLog.create({
                data: {
                    userId: txn!.userId,
                    action: txn!.type === "DEPOSIT" ? "DEPOSIT_CONFIRMED" : "WITHDRAWAL_CONFIRMED",
                    metadata: { apiRef, invoiceId, amountCents: txn!.amountCents },
                },
            })
        })

        // Credit wallet OUTSIDE Prisma transaction (uses row lock)
        // NOTE: transactionId is a FK to MpesaTransaction — pass undefined for IntaSend txns
        if (txn.type === "DEPOSIT") {
            await creditWallet(
                txn.userId,
                txn.amountCents,
                undefined,
                "CREDIT",
                `M-Pesa deposit via IntaSend (ref: ${(apiRef ?? invoiceId ?? "").slice(0, 8)})`
            )
            console.info("[WEBHOOK] Wallet credited:", txn.userId, txn.amountCents, "cents")
        }

        return { processed: true, type: txn.type as "DEPOSIT" | "WITHDRAWAL" }

    } else if (state === "FAILED") {
        // ── FAILURE PATH ──
        await db.$transaction(async (tx) => {
            await tx.intaSendTransaction.update({
                where: { id: txn!.id },
                data: {
                    status: TransactionStatus.FAILED,
                    rawWebhook: payload as any,
                },
            })

            await tx.auditLog.create({
                data: {
                    userId: txn!.userId,
                    action: txn!.type === "DEPOSIT" ? "DEPOSIT_FAILED" : "WITHDRAWAL_FAILED",
                    metadata: {
                        apiRef,
                        reason: payload.failed_reason ?? "Unknown",
                    },
                },
            })
        })

        // If a withdrawal failed, refund the user
        // NOTE: transactionId is a FK to MpesaTransaction — pass undefined for IntaSend txns
        if (txn.type === "WITHDRAWAL") {
            await creditWallet(
                txn.userId,
                txn.amountCents,
                undefined,
                "CREDIT",
                `Withdrawal refund — IntaSend payout failed`
            )
        }

        return { processed: true, type: txn.type as "DEPOSIT" | "WITHDRAWAL" }
    }

    // PENDING / PROCESSING — do nothing, wait for next webhook
    console.info("[WEBHOOK] State still pending:", state)
    return { processed: false, error: `Transaction still ${state}` }
}

/**
 * Handles payout (withdrawal) webhook callbacks.
 * IntaSend sends a batch payout result with transaction statuses.
 */
async function processPayoutWebhook(
    payload: IntaSendWebhookPayload
): Promise<WebhookResult> {
    // For now, log and return — we handle withdrawals via
    // the api_ref path above. Batch callbacks are informational.
    console.info("[INTASEND] Payout batch webhook received:", payload.id)
    return { processed: true, type: "WITHDRAWAL" }
}

// ──────────────────────────────────────────────
// WITHDRAWAL
// ──────────────────────────────────────────────

export interface WithdrawalResult {
    success: boolean
    apiRef?: string
    error?: string
}

/**
 * Initiates a withdrawal — debits wallet, then calls IntaSend payouts.
 * On IntaSend failure, wallet is automatically refunded.
 *
 * @param userId - Authenticated user
 * @param amountKES - Amount in whole KES
 * @param userName - User's full name
 * @param rawPhone - User's M-Pesa number
 */
export async function initiateWithdrawal(
    userId: string,
    amountKES: number,
    userName: string,
    rawPhone: string
): Promise<WithdrawalResult> {

    if (amountKES < 10) {
        return { success: false, error: "Minimum withdrawal is KES 10." }
    }

    let phone: string
    try {
        phone = normalisePhone(rawPhone)
    } catch {
        return { success: false, error: "Invalid phone number." }
    }

    const amountCents = amountKES * 100
    const apiRef = randomUUID()

    // 1. Debit wallet FIRST (prevents double-spend)
    let txnId: string
    try {
        const debitResult = await debitWallet(userId, amountCents, undefined, "DEBIT", `Withdrawal request (ref: ${apiRef.slice(0, 8)})`)
        txnId = debitResult.ledgerEntryId
    } catch (error: any) {
        return { success: false, error: error.message ?? "Insufficient balance." }
    }

    // 2. Create PENDING withdrawal record
    const txn = await db.intaSendTransaction.create({
        data: {
            userId,
            apiRef,
            type: "WITHDRAWAL",
            amountCents,
            status: TransactionStatus.PENDING,
            phone,
        },
    })

    // 3. Call IntaSend payouts
    try {
        await initiatePayoutToMpesa(
            phone,
            amountKES,
            userName,
            `StakePesa withdrawal (ref: ${apiRef.slice(0, 8)})`
        )

        await db.auditLog.create({
            data: {
                userId,
                action: "WITHDRAWAL_INITIATED",
                metadata: { amountKES, apiRef, phone },
            },
        })

        return { success: true, apiRef }

    } catch (error: any) {
        // Payout API failed — refund wallet immediately
        console.error("[INTASEND] Payout failed, refunding:", error?.message)

        await db.intaSendTransaction.update({
            where: { id: txn.id },
            data: { status: TransactionStatus.FAILED },
        })

        await creditWallet(userId, amountCents, undefined, "CREDIT", "Withdrawal refund — payout initiation failed")

        return { success: false, error: "Payout failed. Your balance has been refunded." }
    }
}
