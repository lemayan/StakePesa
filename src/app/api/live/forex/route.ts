import { NextResponse } from "next/server"

export const revalidate = 3600 // forex rates update once per day — cache 1hr

export async function GET() {
  try {
    const key = process.env.EXCHANGERATE_API_KEY
    if (!key) throw new Error("EXCHANGERATE_API_KEY not set")

    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${key}/latest/USD`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`ExchangeRate error: ${res.status}`)
    const data = await res.json()

    const r = data.conversion_rates ?? {}
    return NextResponse.json({
      base: "USD",
      rates: {
        KES: r.KES ?? 129,
        EUR: r.EUR ?? 0.85,
        GBP: r.GBP ?? 0.74,
        JPY: r.JPY ?? 159,
        ZAR: r.ZAR ?? 16.4,
        NGN: r.NGN ?? 1342,
        TZS: r.TZS ?? 2600,
        UGX: r.UGX ?? 3700,
        ETB: r.ETB ?? 156,
      },
      updatedAt: data.time_last_update_utc ?? null,
    })
  } catch (err) {
    console.error("[/api/live/forex]", err)
    return NextResponse.json({ error: "Failed to fetch forex rates" }, { status: 500 })
  }
}
