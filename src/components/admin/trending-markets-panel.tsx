"use client"

import { useOptimistic, useState, useTransition } from "react"
import { toggleTrendingAction } from "@/actions/admin"
import { Flame, GripVertical, AlertTriangle, CheckCircle2 } from "lucide-react"

type ActiveMarket = {
  id: string
  title: string
  status: "OPEN" | "CLOSED" | "RESOLVING" | "SETTLED"
  trending: boolean
  isActive: boolean
  totalStakeCents: number
  imbalance: number
  imbalanceLabel: string
  riskSummary: string
  closesAt: Date
  outcomes: Array<{ name: string }>
  sector: { title: string }
}

type Props = {
  markets: ActiveMarket[]
}

export function TrendingMarketsPanel({ markets }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

  const [optimisticMarkets, setOptimisticMarkets] = useOptimistic(
    markets,
    (state, patch: { marketId: string; value: boolean }) =>
      state.map((market) =>
        market.id === patch.marketId
          ? { ...market, trending: patch.value }
          : market
      )
  )

  function setTrending(marketId: string, value: boolean) {
    setOptimisticMarkets({ marketId, value })
    startTransition(async () => {
      const result = await toggleTrendingAction(marketId, value)
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage({ type: "error", text: error })
      }
    })
  }

  // Only show markets that can potentially be trending (OPEN)
  const openMarkets = optimisticMarkets.filter(m => m.status === "OPEN")

  return (
    <div className="space-y-4">
      {message && (
        <div className={`rounded-xl border p-4 ${message.type === "error" ? "border-red/20 bg-red/10 text-red" : "border-green/20 bg-green/10 text-green"}`}>
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {message.text}
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="overflow-x-auto rounded-lg border border-line bg-bg-above/20">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-line bg-bg text-[12px] uppercase tracking-wider text-fg-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Market / Sector</th>
              <th className="px-4 py-3 font-semibold">Slider Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {openMarkets.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No open markets available for sliders.
                </td>
              </tr>
            )}
            {openMarkets.map((market) => (
              <tr key={market.id} className="hover:bg-bg-above/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 text-fg-muted"><GripVertical className="h-3 w-3" /></div>
                    <div>
                      <p className="font-semibold text-[14px] text-fg max-w-[400px] truncate" title={market.title}>{market.title}</p>
                      <p className="text-[12px] text-fg-muted mt-0.5">{market.sector.title} · Vol: {((market.totalStakeCents || 0) / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })} KES</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 w-[200px]">
                  <button
                    onClick={() => setTrending(market.id, !market.trending)}
                    className={`inline-flex items-center gap-1.5 w-fit rounded border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider transition ${market.trending ? "border-amber bg-amber/10 text-amber" : "border-line bg-bg text-fg-muted hover:bg-bg-above"}`}
                  >
                    <Flame className="h-4 w-4" /> {market.trending ? "Trending" : "Disabled"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
