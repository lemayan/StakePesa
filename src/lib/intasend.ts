// @ts-ignore — intasend-node has no TypeScript types
import IntaSend from "intasend-node"

// ──────────────────────────────────────────────
// INTASEND CLIENT
// Single SDK instance, environment-aware.
// isSandbox=false → live transactions
// ──────────────────────────────────────────────

function getClient() {
    const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY
    const secretKey = process.env.INTASEND_SECRET_KEY

    if (!publishableKey || !secretKey) {
        throw new Error(
            "Missing IntaSend configuration. Required: INTASEND_PUBLISHABLE_KEY, INTASEND_SECRET_KEY"
        )
    }

    const isSandbox = process.env.INTASEND_ENV !== "live"
    return new IntaSend(publishableKey, secretKey, isSandbox)
}

// ──────────────────────────────────────────────
// STK PUSH (DEPOSIT)
// Triggers M-Pesa payment prompt on user's phone.
// api_ref is our internal transaction ID for matching callbacks.
// ──────────────────────────────────────────────

export interface STKPushResult {
    invoice: {
        invoice_id: string
        state: string
        provider: string
        charges: number
        net_amount: number
        currency: string
        value: number
        account: string
        api_ref: string
        host: string
        failed_reason: string | null
        created_at: string
        updated_at: string
    }
    customer: {
        customer_id: string
        phone_number: string
        email: string
        first_name: string
        last_name: string
    }
    payment_link: string | null
}

/**
 * Initiates an M-Pesa STK Push via IntaSend.
 *
 * @param phone - Phone in format 2547XXXXXXXX (no +)
 * @param amountKES - Amount in whole KES
 * @param apiRef - Our internal transaction UUID (used to match webhook)
 * @param firstName - User's first name (shown on M-Pesa prompt)
 */
export async function initiateSTKPush(
    phone: string,
    amountKES: number,
    apiRef: string,
    firstName: string = "Customer"
): Promise<STKPushResult> {
    const client = getClient()
    const collection = client.collection()

    const host = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://stake-pesa.vercel.app"

    const result = await collection.mpesaStkPush({
        first_name: firstName,
        last_name: "StakePesa",
        email: "payments@stakepesa.com",
        host,
        amount: amountKES,
        phone_number: phone,
        api_ref: apiRef,
    })

    return result
}

// ──────────────────────────────────────────────
// PAYOUT (WITHDRAWAL — B2C equivalent)
// Sends money from StakePesa to user's M-Pesa.
// ──────────────────────────────────────────────

export interface PayoutResult {
    id: string
    status: string
    transactions: {
        status: string
        request_reference_id: string
        name: string
        account: string
        amount: number
        narrative: string
    }[]
}

/**
 * Sends money to a user's M-Pesa number via IntaSend payouts.
 *
 * @param phone - Phone in format 2547XXXXXXXX
 * @param amountKES - Amount in whole KES
 * @param name - User's full name
 * @param narrative - Description shown on M-Pesa message
 */
export async function initiatePayoutToMpesa(
    phone: string,
    amountKES: number,
    name: string,
    narrative: string = "StakePesa winnings"
): Promise<PayoutResult> {
    const client = getClient()
    const payouts = client.payouts()

    const result = await payouts.mpesa({
        currency: "KES",
        transactions: [
            {
                name,
                account: phone,
                amount: String(amountKES),
                narrative,
            },
        ],
    })

    return result
}

// ──────────────────────────────────────────────
// WEBHOOK VERIFICATION
// IntaSend sends a challenge key in headers.
// We compare it to our stored challenge to reject fakes.
// ──────────────────────────────────────────────

/**
 * Verifies that a webhook request genuinely came from IntaSend.
 * Returns true if the challenge matches.
 */
export function verifyIntaSendWebhook(
    receivedChallenge: string | null
): boolean {
    const expectedChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE
    if (!expectedChallenge) {
        // If no challenge configured, accept all (dev mode)
        console.warn("[INTASEND] INTASEND_WEBHOOK_CHALLENGE not set — skipping webhook verification")
        return true
    }
    return receivedChallenge === expectedChallenge
}

// ──────────────────────────────────────────────
// PHONE NORMALISATION
// IntaSend expects 2547XXXXXXXX format (no + prefix)
// ──────────────────────────────────────────────

/**
 * Normalises a Kenyan phone number to IntaSend format: 2547XXXXXXXX
 */
export function normalisePhone(raw: string): string {
    const cleaned = raw.replace(/\s+/g, "").replace(/^\+/, "")

    if (cleaned.startsWith("254")) return cleaned
    if (cleaned.startsWith("07") || cleaned.startsWith("01")) {
        return "254" + cleaned.slice(1)
    }
    throw new Error(`Unrecognised phone format: ${raw}`)
}
