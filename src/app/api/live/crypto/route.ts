import { NextResponse } from "next/server"

export const revalidate = 15 // cache for 15 seconds

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true",
      { next: { revalidate: 15 } }
    )
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)
    const data = await res.json()

    return NextResponse.json({
      btc: {
        price: data.bitcoin?.usd ?? 0,
        change24h: data.bitcoin?.usd_24h_change ?? 0,
        volume24h: data.bitcoin?.usd_24h_vol ?? 0,
      },
      eth: {
        price: data.ethereum?.usd ?? 0,
        change24h: data.ethereum?.usd_24h_change ?? 0,
        volume24h: data.ethereum?.usd_24h_vol ?? 0,
      },
      sol: {
        price: data.solana?.usd ?? 0,
        change24h: data.solana?.usd_24h_change ?? 0,
        volume24h: data.solana?.usd_24h_vol ?? 0,
      },
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.error("[/api/live/crypto]", err)
    return NextResponse.json({ error: "Failed to fetch crypto prices" }, { status: 500 })
  }
}
