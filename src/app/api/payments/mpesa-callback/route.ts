import { NextRequest, NextResponse } from "next/server"
import { processCallback } from "@/lib/payment"

// ──────────────────────────────────────────────
// M-PESA CALLBACK HANDLER
// POST /api/payments/mpesa-callback
//
// Safaricom sends STK Push results to this endpoint.
// CRITICAL RULES:
// 1. ALWAYS return 200 — Safaricom retries on non-200
// 2. No authentication — Safaricom doesn't send auth headers
// 3. Idempotent — safe to receive same callback multiple times
// 4. Never leak internal errors to the response body
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json()

        console.info(
            "[MPESA_CALLBACK] Received:",
            JSON.stringify(payload).slice(0, 500)
        )

        const result = await processCallback(payload)

        if (!result.processed) {
            // Log the issue but still return 200 to prevent Safaricom retries
            console.warn("[MPESA_CALLBACK] Not processed:", result.error)
        } else {
            console.info("[MPESA_CALLBACK] Processed successfully:", result.transactionId)
        }

        // Always return 200 OK to Safaricom
        return NextResponse.json(
            { ResultCode: 0, ResultDesc: "Accepted" },
            { status: 200 }
        )
    } catch (error) {
        // Catch-all: log and still return 200
        console.error("[MPESA_CALLBACK] Unhandled error:", error)

        return NextResponse.json(
            { ResultCode: 0, ResultDesc: "Accepted" },
            { status: 200 }
        )
    }
}

// Safaricom may send HEAD or GET to verify the URL is reachable
export async function GET() {
    return NextResponse.json({ status: "ok" }, { status: 200 })
}
