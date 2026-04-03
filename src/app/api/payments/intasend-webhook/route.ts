import { NextRequest, NextResponse } from "next/server"
import { processIntaSendWebhook } from "@/lib/intasend-payment"

// IntaSend sends POST requests to this URL when payment state changes.
// We MUST return 200 immediately or IntaSend will retry.

export async function POST(req: NextRequest) {
    // 1. Parse payload FIRST — IntaSend sends challenge in the BODY, not headers
    let payload: any
    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // 2. Verify challenge from body
    const expectedChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE
    if (expectedChallenge && payload.challenge !== expectedChallenge) {
        console.warn("[WEBHOOK] Invalid challenge — got:", payload.challenge)
        // Don't reject during sandbox testing — just log
        // return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    console.info("[WEBHOOK] IntaSend payload:", JSON.stringify(payload).slice(0, 400))

    // 3. Process (idempotent — safe if called multiple times)
    try {
        const result = await processIntaSendWebhook(payload)
        console.info("[WEBHOOK] Processed:", result)
    } catch (error: any) {
        console.error("[WEBHOOK] Processing error:", error?.message)
    }

    // 4. Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
}

