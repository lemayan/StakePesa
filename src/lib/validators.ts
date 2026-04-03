import { z } from "zod"

// ──────────────────────────────────────────────
// PHONE NUMBER VALIDATION
// Strict E.164 format for Kenyan M-Pesa numbers.
// Accepts: +2547XXXXXXXX (13 chars total)
// Safaricom prefixes: 70x, 71x, 72x, 74x, 75x, 76x, 79x
// ──────────────────────────────────────────────

export const phoneNumberSchema = z
    .string()
    .trim()
    .regex(
        /^\+254(7[0-9]{8})$/,
        "Phone number must be in E.164 format: +2547XXXXXXXX"
    )

/**
 * Normalizes a phone number to E.164 format.
 * Accepts: 0712345678, 254712345678, +254712345678, 712345678
 */
export function normalizePhoneNumber(raw: string): string {
    const cleaned = raw.replace(/[\s\-()]/g, "")

    if (/^0[17]\d{8}$/.test(cleaned)) {
        return `+254${cleaned.slice(1)}`
    }
    if (/^254[17]\d{8}$/.test(cleaned)) {
        return `+${cleaned}`
    }
    if (/^\+254[17]\d{8}$/.test(cleaned)) {
        return cleaned
    }
    if (/^[17]\d{8}$/.test(cleaned)) {
        return `+254${cleaned}`
    }

    throw new Error(`Cannot normalize phone number: ${raw}`)
}

// ──────────────────────────────────────────────
// VERIFY PHONE REQUEST
// ──────────────────────────────────────────────

export const verifyPhoneSchema = z.object({
    phoneNumber: z.string().min(1, "Phone number is required"),
})

// ──────────────────────────────────────────────
// DEPOSIT REQUEST
// ──────────────────────────────────────────────

export const depositSchema = z.object({
    amount: z.number().int().min(100, "Minimum deposit is KES 1 (100 cents)"),
    challengeId: z.string().uuid().optional(),
})

// ──────────────────────────────────────────────
// M-PESA CALLBACK PAYLOAD
// Validates the structure Safaricom sends back.
// ──────────────────────────────────────────────

const stkCallbackItemSchema = z.object({
    Name: z.string(),
    Value: z.union([z.string(), z.number()]).optional(),
})

const stkCallbackSchema = z.object({
    MerchantRequestID: z.string(),
    CheckoutRequestID: z.string(),
    ResultCode: z.number(),
    ResultDesc: z.string(),
    CallbackMetadata: z
        .object({
            Item: z.array(stkCallbackItemSchema),
        })
        .optional(),
})

export const mpesaCallbackSchema = z.object({
    Body: z.object({
        stkCallback: stkCallbackSchema,
    }),
})

export type MpesaCallbackPayload = z.infer<typeof mpesaCallbackSchema>
export type STKCallbackData = z.infer<typeof stkCallbackSchema>

/**
 * Extracts typed metadata fields from the callback.
 */
export function extractCallbackMetadata(callback: STKCallbackData) {
    const items = callback.CallbackMetadata?.Item ?? []
    const get = (name: string) => items.find((i) => i.Name === name)?.Value

    return {
        amount: get("Amount") as number | undefined,
        mpesaReceiptNumber: get("MpesaReceiptNumber") as string | undefined,
        transactionDate: get("TransactionDate") as string | undefined,
        phoneNumber: get("PhoneNumber") as string | undefined,
    }
}
