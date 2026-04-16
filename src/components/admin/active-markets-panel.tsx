"use client"

import { useOptimistic, useState, useTransition } from "react"
import { resolveAdminMarketAction, toggleMarketActiveAction, toggleTrendingAction } from "@/actions/admin"

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

export function ActiveMarketsPanel({ markets }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<ActiveMarket | null>(null)
  const [winningOutcome, setWinningOutcome] = useState("")
  const [confirmText, setConfirmText] = useState("")

  const [optimisticMarkets, setOptimisticMarkets] = useOptimistic(
    markets,
    (state, patch: { marketId: string; type: "trending" | "active"; value: boolean }) =>
      state.map((market) =>
        market.id === patch.marketId
          ? patch.type === "trending"
            ? { ...market, trending: patch.value }
            : { ...market, isActive: patch.value, status: patch.value ? "OPEN" : "CLOSED" }
          : market
      )
  )

  function setTrending(marketId: string, value: boolean) {
    setOptimisticMarkets({ marketId, type: "trending", value })
    startTransition(async () => {
      const result = await toggleTrendingAction(marketId, value)
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage(error)
      }
    })
  }

  function setActive(marketId: string, value: boolean) {
    setOptimisticMarkets({ marketId, type: "active", value })
    startTransition(async () => {
      const result = await toggleMarketActiveAction(marketId, value)
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage(error)
      }
    })
  }

  function submitResolve() {
    if (!resolveTarget) return
    startTransition(async () => {
      const result = await resolveAdminMarketAction({
        marketId: resolveTarget.id,
        winningOutcome,
        confirmationText: confirmText as "RESOLVE",
      })
      if ("error" in result && result.error) {
        setMessage(result.error)
        return
      }
      setMessage(`Market resolved: ${resolveTarget.title}`)
      setResolveTarget(null)
      setWinningOutcome("")
      setConfirmText("")
    })
  }

  return (
    <section className="space-y-3 rounded-3xl border border-line bg-bg/90 p-5">
      <header className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Active Markets</h3>
        <span className="rounded-full border border-line bg-bg-above px-2.5 py-1 text-xs font-mono text-fg-muted">{optimisticMarkets.length} markets</span>
      </header>

      {message && <p className="rounded-xl border border-green/25 bg-green/10 px-3 py-2 text-sm text-green">{message}</p>}

      <div className="max-h-[680px] space-y-2 overflow-auto pr-1">
        {optimisticMarkets.map((market) => (
          <article key={market.id} className="rounded-2xl border border-line bg-bg-above/50 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{market.title}</p>
                <p className="text-xs text-fg-muted">{market.sector.title} · closes {new Date(market.closesAt).toLocaleString()}</p>
                <p className="mt-1 text-xs font-mono text-fg-muted">Active stakes: {(market.totalStakeCents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })} KES</p>
                <p className={`mt-1 text-xs font-semibold ${market.imbalance >= 0.8 ? "text-red" : market.imbalance >= 0.6 ? "text-amber" : "text-green"}`}>{market.riskSummary} ({market.imbalanceLabel})</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrending(market.id, !market.trending)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${market.trending ? "border-green/30 bg-green/10 text-green" : "border-line bg-bg text-fg-muted"}`}
                >
                  Trending: {market.trending ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => setActive(market.id, !market.isActive)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${market.isActive ? "border-green/30 bg-green/10 text-green" : "border-line bg-bg text-fg-muted"}`}
                >
                  {market.isActive ? "Active" : "Paused"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResolveTarget(market)
                    setWinningOutcome(market.outcomes[0]?.name ?? "")
                  }}
                  className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs font-semibold text-red"
                >
                  Resolve
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-xl border border-line bg-bg p-4">
            <h4 className="text-lg font-semibold">Resolve Market</h4>
            <p className="mt-1 text-sm text-fg-muted">This action is irreversible and triggers financial settlement.</p>

            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-mono text-fg-muted">Winning Outcome</span>
                <select value={winningOutcome} onChange={(e) => setWinningOutcome(e.target.value)} className="h-10 rounded-lg border border-line bg-bg-above px-3">
                  {resolveTarget.outcomes.map((outcome) => (
                    <option key={outcome.name} value={outcome.name}>{outcome.name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-mono text-fg-muted">Type RESOLVE to confirm</span>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="h-10 rounded-lg border border-line bg-bg-above px-3" />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setResolveTarget(null)} className="rounded-lg border border-line px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={submitResolve}
                disabled={confirmText !== "RESOLVE" || isPending}
                className="rounded-lg bg-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? "Resolving..." : "Confirm Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
