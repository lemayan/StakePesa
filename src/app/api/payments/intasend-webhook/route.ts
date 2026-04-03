import { NextRequest, NextResponse } from "next/server"
import { processIntaSendWebhook } from "@/lib/intasend-payment"
import { verifyIntaSendWebhook } from "@/lib/intasend"

// IntaSend sends POST requests to this URL when payment state changes.
// We MUST return 200 immediately or IntaSend will retry.

export async function POST(req: NextRequest) {
    // 1. Verify this is genuinely from IntaSend
    const challenge = req.headers.get("X-IntaSend-Signature") 
        ?? req.headers.get("x-intasend-signature")
        ?? null

    if (!verifyIntaSendWebhook(challenge)) {
        console.warn("[WEBHOOK] Invalid IntaSend signature — rejected")
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    // 2. Parse payload
    let payload: any
    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    console.info("[WEBHOOK] IntaSend payload received:", JSON.stringify(payload).slice(0, 300))

    // 3. Process (idempotent — safe if called multiple times)
    try {
        const result = await processIntaSendWebhook(payload)
        console.info("[WEBHOOK] Processed:", result)
    } catch (error: any) {
        // Log but still return 200 — we don't want IntaSend to keep retrying
        // for errors that are on our side
        console.error("[WEBHOOK] Processing error:", error?.message)
    }

    // 4. Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
}
