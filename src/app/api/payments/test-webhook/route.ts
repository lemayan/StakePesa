import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { processIntaSendWebhook } from "@/lib/intasend-payment"
import { db } from "@/lib/db"

// POST /api/payments/test-webhook
// Simulates a successful IntaSend payment confirmation.
// ⚠️ DEVELOPMENT / DEMO USE ONLY — disable in production after launch.

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const body = await req.json()
    const { apiRef } = body

    if (!apiRef) {
        return NextResponse.json({ error: "apiRef is required" }, { status: 400 })
    }

    // Verify the transaction belongs to this user
    const txn = await db.intaSendTransaction.findUnique({
        where: { apiRef },
        select: { userId: true, amountCents: true, status: true },
    })

    if (!txn) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }
    if (txn.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 403 })
    }
    if (txn.status !== "PENDING") {
        return NextResponse.json({ error: `Transaction already ${txn.status}` }, { status: 400 })
    }

    // Simulate the webhook payload IntaSend would send
    const simulatedPayload = {
        invoice_id: `TEST_${Date.now()}`,
        api_ref: apiRef,
        state: "COMPLETE",
        value: txn.amountCents / 100,
        currency: "KES",
        challenge: process.env.INTASEND_WEBHOOK_CHALLENGE ?? "",
    }

    const result = await processIntaSendWebhook(simulatedPayload)

    return NextResponse.json({
        success: true,
        message: "Payment simulated successfully",
        result,
    })
}
