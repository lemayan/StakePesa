import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { checkInvoiceStatus } from "@/lib/intasend"
import { processIntaSendWebhook } from "@/lib/intasend-payment"

// GET /api/payments/status/[apiRef]
// Returns the current status of a specific transaction by its apiRef.
// For PENDING deposits, also polls IntaSend directly and auto-credits
// the wallet if the payment completed — works without webhooks (local dev).
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ apiRef: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const { apiRef } = await params

    const txn = await db.intaSendTransaction.findUnique({
        where: { apiRef },
        select: {
            id: true,
            status: true,
            type: true,
            amountCents: true,
            invoiceId: true,
            userId: true,
        },
    })

    if (!txn) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    if (txn.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 403 })
    }

    let resolvedStatus = txn.status

    // ── For PENDING deposits, poll IntaSend directly ──
    // This handles the case where the webhook can't reach us (local dev / no ngrok).
    // If IntaSend says COMPLETE, we process it here and credit the wallet.
    if (txn.status === "PENDING" && txn.type === "DEPOSIT" && txn.invoiceId) {
        try {
            const invoiceStatus = await checkInvoiceStatus(txn.invoiceId)
            const state = invoiceStatus.state?.toUpperCase()

            if (state === "COMPLETE" || state === "FAILED") {
                console.info(`[STATUS POLL] Invoice ${txn.invoiceId} is ${state} — processing now`)
                await processIntaSendWebhook({
                    invoice_id: txn.invoiceId,
                    api_ref: apiRef,
                    state: invoiceStatus.state,
                    value: invoiceStatus.value,
                    currency: "KES",
                    failed_reason: invoiceStatus.failed_reason ?? undefined,
                })
                resolvedStatus = state === "COMPLETE" ? "SUCCESS" : "FAILED"
            }
        } catch (err: any) {
            // Don't fail the request if polling fails — just return DB status
            console.warn("[STATUS POLL] Could not fetch IntaSend status:", err?.message)
        }
    }

    const wallet = await db.wallet.findUnique({
        where: { userId: session.user.id },
        select: { balance: true },
    })

    return NextResponse.json({
        status: resolvedStatus,
        type: txn.type,
        amountCents: txn.amountCents,
        balanceCents: wallet?.balance ?? 0,
    })
}
