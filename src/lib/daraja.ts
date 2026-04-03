import axios, { AxiosInstance } from "axios"

// ──────────────────────────────────────────────
// DARAJA API CLIENT
// Safaricom M-Pesa Lipa Na M-Pesa Online (STK Push)
// OAuth token caching with in-memory TTL.
// ──────────────────────────────────────────────

const SANDBOX_BASE = "https://sandbox.safaricom.co.ke"
const PRODUCTION_BASE = "https://api.safaricom.co.ke"

function getBaseUrl(): string {
    return process.env.MPESA_ENVIRONMENT === "production"
        ? PRODUCTION_BASE
        : SANDBOX_BASE
}

function getConfig() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET
    const shortcode = process.env.MPESA_SHORTCODE
    const passkey = process.env.MPESA_PASSKEY
    const callbackUrl = process.env.MPESA_CALLBACK_URL
    const tillNumber = process.env.MPESA_TILL_NUMBER // For Buy Goods (Till)

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
        throw new Error(
            "Missing M-Pesa configuration. Required env vars: " +
            "MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, " +
            "MPESA_PASSKEY, MPESA_CALLBACK_URL"
        )
    }

    return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl, tillNumber }
}

// ──────────────────────────────────────────────
// OAUTH TOKEN CACHE
// Daraja tokens expire in 3600s. We cache for 3500s.
// Module-scoped singleton — survives across requests.
// ──────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiresAt: number = 0

/**
 * Fetches a Daraja OAuth access token.
 * Uses in-memory cache with TTL to avoid unnecessary HTTP calls.
 */
export async function getAccessToken(): Promise<string> {
    const now = Date.now()

    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken
    }

    const { consumerKey, consumerSecret } = getConfig()
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")

    const response = await axios.get(
        `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
            headers: {
                Authorization: `Basic ${credentials}`,
            },
            timeout: 10000,
        }
    )

    cachedToken = response.data.access_token
    // Cache for 3500s (100s buffer before actual 3600s expiry)
    tokenExpiresAt = now + 3500 * 1000

    return cachedToken!
}

// ──────────────────────────────────────────────
// STK PUSH
// Lipa Na M-Pesa Online API
// ──────────────────────────────────────────────

/**
 * Generates the Daraja password and timestamp.
 * Password = Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(): { password: string; timestamp: string } {
    const { shortcode, passkey } = getConfig()
    const now = new Date()
    const timestamp =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0")

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64")

    return { password, timestamp }
}

export interface STKPushResponse {
    MerchantRequestID: string
    CheckoutRequestID: string
    ResponseCode: string
    ResponseDescription: string
    CustomerMessage: string
}

export interface STKPushError {
    requestId: string
    errorCode: string
    errorMessage: string
}

/**
 * Initiates an STK Push request to the user's phone.
 *
 * @param phoneNumber - E.164 format (+2547XXXXXXXX)
 * @param amountKES - Amount in whole KES (not cents — Daraja expects whole numbers)
 * @param accountReference - Short reference shown on phone (max 12 chars)
 * @param transactionDesc - Description (max 13 chars)
 */
export async function initiateSTKPush(
    phoneNumber: string,
    amountKES: number,
    accountReference: string = "StakePesa",
    transactionDesc: string = "Payment"
): Promise<STKPushResponse> {
    const token = await getAccessToken()
    const { shortcode, callbackUrl, tillNumber } = getConfig()
    const { password, timestamp } = generatePassword()

    // Daraja expects phone in format 2547XXXXXXXX (no +)
    const darajaPhone = phoneNumber.replace("+", "")

    // Use Buy Goods (Till) if tillNumber is set, otherwise Paybill
    const isTill = !!tillNumber
    const transactionType = isTill ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline"
    const partyB = isTill ? tillNumber : shortcode

    const response = await axios.post<STKPushResponse>(
        `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: transactionType,
            Amount: amountKES,
            PartyA: darajaPhone,
            PartyB: partyB,
            PhoneNumber: darajaPhone,
            CallBackURL: callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            timeout: 30000, // STK can be slow
        }
    )

    return response.data
}

/**
 * Queries the status of an STK Push transaction.
 * Useful for polling when callbacks are delayed.
 */
export async function querySTKStatus(checkoutRequestId: string) {
    const token = await getAccessToken()
    const { shortcode } = getConfig()
    const { password, timestamp } = generatePassword()

    const response = await axios.post(
        `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        }
    )

    return response.data
}
