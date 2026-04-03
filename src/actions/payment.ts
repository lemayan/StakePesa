"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { initiatePhoneVerification, initiateDeposit, checkTransactionByQuery } from "@/lib/payment"
import { verifyPhoneSchema, depositSchema } from "@/lib/validators"
import { getWalletBalance } from "@/lib/wallet"

// ──────────────────────────────────────────────
// VERIFY PHONE ACTION
// Authenticated server action for phone verification.
// ──────────────────────────────────────────────

export async function verifyPhoneAction(formData: FormData) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "You must be logged in to verify your phone." }
    }

    const raw = {
        phoneNumber: formData.get("phoneNumber") as string,
    }

    const parsed = verifyPhoneSchema.safeParse(raw)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const result = await initiatePhoneVerification(session.user.id, parsed.data.phoneNumber)

    if (!result.success) {
        return { error: result.error }
    }

    return {
        success: result.alreadyVerified
            ? "Identity automatically verified from global records."
            : "M-Pesa prompt sent to your phone. Enter your PIN to complete verification.",
        checkoutRequestId: result.checkoutRequestId,
        alreadyVerified: result.alreadyVerified,
    }
}

// ──────────────────────────────────────────────
// DEPOSIT ACTION
// Authenticated server action for wallet deposits.
// ──────────────────────────────────────────────

export async function depositAction(formData: FormData) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "You must be logged in to deposit." }
    }

    const amountStr = formData.get("amount") as string
    const amount = parseInt(amountStr, 10)

    if (isNaN(amount)) {
        return { error: "Invalid amount." }
    }

    const parsed = depositSchema.safeParse({ amount })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const result = await initiateDeposit(session.user.id, parsed.data.amount)

    if (!result.success) {
        return { error: result.error }
    }

    return {
        success: "M-Pesa prompt sent. Enter your PIN to complete the deposit.",
        checkoutRequestId: result.checkoutRequestId,
    }
}

// ──────────────────────────────────────────────
// GET BALANCE ACTION
// Returns the user's current wallet balance.
// ──────────────────────────────────────────────

export async function getBalanceAction() {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Not authenticated." }
    }

    const balance = await getWalletBalance(session.user.id)

    return { balance }
}

// ──────────────────────────────────────────────
// GET VERIFICATION STATUS
// Returns phone verification status for the current user.
// ──────────────────────────────────────────────

export async function getVerificationStatus() {
    const session = await auth()

    if (!session?.user?.id) {
        return { isVerified: false, phoneNumber: null }
    }

    const profile = await db.paymentProfile.findUnique({
        where: { userId: session.user.id },
        select: { isVerified: true, phoneNumber: true },
    })

    return {
        isVerified: profile?.isVerified ?? false,
        phoneNumber: profile?.phoneNumber ?? null,
    }
}

// ──────────────────────────────────────────────
// CHECK VERIFICATION (STK Query Fallback)
// Queries Safaricom directly when callbacks are missed.
// ──────────────────────────────────────────────

export async function checkVerificationAction(checkoutRequestId?: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Not authenticated." }
    }

    // Find the latest pending verification transaction for this user
    const transaction = checkoutRequestId
        ? await db.mpesaTransaction.findUnique({
            where: { checkoutRequestId },
            select: { checkoutRequestId: true, status: true },
        })
        : await db.mpesaTransaction.findFirst({
            where: {
                userId: session.user.id,
                type: "VERIFY",
                status: "PENDING",
            },
            orderBy: { createdAt: "desc" },
            select: { checkoutRequestId: true, status: true },
        })

    if (!transaction) {
        return { error: "No pending verification found." }
    }

    if (transaction.status !== "PENDING") {
        // Already processed — check if verified
        const profile = await db.paymentProfile.findUnique({
            where: { userId: session.user.id },
            select: { isVerified: true },
        })
        return { alreadyProcessed: true, isVerified: profile?.isVerified ?? false }
    }

    // Query Safaricom directly
    const result = await checkTransactionByQuery(transaction.checkoutRequestId)

    if (result.processed) {
        return { success: true, verified: true }
    }

    return { error: result.error ?? "Transaction still processing." }
}
