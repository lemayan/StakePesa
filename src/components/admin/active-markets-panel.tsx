"use client"

import { useOptimistic, useState, useTransition } from "react"
import { resolveAdminMarketAction, toggleMarketActiveAction } from "@/actions/admin"
import { Play, Pause, GripVertical, AlertTriangle, Coins, CheckCircle2, ShieldAlert } from "lucide-react"

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
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
  const [resolveTarget, setResolveTarget] = useState<ActiveMarket | null>(null)
  const [winningOutcome, setWinningOutcome] = useState("")
  const [confirmText, setConfirmText] = useState("")

  const [optimisticMarkets, setOptimisticMarkets] = useOptimistic(
    markets,
    (state, patch: { marketId: string; type: "active"; value: boolean }) =>
      state.map((market) =>
        market.id === patch.marketId
          ? { ...market, isActive: patch.value, status: patch.value ? "OPEN" : "CLOSED" }
          : market
      )
  )

  function setActive(marketId: string, value: boolean) {
    setOptimisticMarkets({ marketId, type: "active", value })
    startTransition(async () => {
      const result = await toggleMarketActiveAction(marketId, value)
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage({ type: "error", text: error })
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
        setMessage({ type: "error", text: result.error })
        return
      }
      setMessage({ type: "success", text: `Market successfully resolved! Payouts triggered.` })
      setTimeout(() => setMessage(null), 4000)
      setResolveTarget(null)
      setWinningOutcome("")
      setConfirmText("")
    })
  }

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
              <th className="px-4 py-3 font-semibold">Pool / Imbalance</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {optimisticMarkets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No active markets.
                </td>
              </tr>
            )}
            {optimisticMarkets.map((market) => (
              <tr key={market.id} className="hover:bg-bg-above/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 text-fg-muted"><GripVertical className="h-3 w-3" /></div>
                    <div>
                      <p className="font-semibold text-[14px] text-fg max-w-[280px] truncate" title={market.title}>{market.title}</p>
                      <p className="text-[12px] text-fg-muted mt-0.5">{market.sector.title} · Closes {new Date(market.closesAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <p className="font-mono text-[13px] font-medium text-fg">
                      {((market.totalStakeCents || 0) / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })} KES
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${market.imbalance >= 0.8 ? "animate-livepulse bg-red" : market.imbalance >= 0.6 ? "bg-amber" : "bg-green"}`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${market.imbalance >= 0.8 ? "text-red" : market.imbalance >= 0.6 ? "text-amber" : "text-green"}`}>
                        {market.riskSummary}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setActive(market.id, !market.isActive)}
                      className={`inline-flex items-center gap-1 w-fit rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition ${market.isActive ? "border-green/20 bg-green/10 text-green" : "border-line bg-bg text-fg-muted hover:bg-bg-above"}`}
                    >
                      {market.isActive ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {market.isActive ? "Live" : "Paused"}
                    </button>
                  </div>
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setResolveTarget(market)
                      setWinningOutcome(market.outcomes[0]?.name ?? "")
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-bg-above border border-line px-3 py-1.5 text-[12px] font-semibold text-fg transition hover:bg-red/10 hover:border-red/20 hover:text-red focus:outline-none"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Settle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resolve Modal Minimalist */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResolveTarget(null)} />
          <div className="relative w-full max-w-sm rounded-[1rem] border border-line bg-bg p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-[16px] font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red" /> Resolve Market</h4>
            <p className="mt-1 text-[13px] text-fg-muted">Select the winning outcome. This will irreversibly settle the market and execute payouts.</p>

            <div className="mb-4 mt-4 rounded-lg bg-bg-above/50 p-3">
              <p className="text-[12px] font-semibold text-fg max-w-full truncate">{resolveTarget.title}</p>
            </div>

            <div className="space-y-4">
              <label className="grid gap-1.5">
                <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Outcome</span>
                <select value={winningOutcome} onChange={(e) => setWinningOutcome(e.target.value)} className="h-9 w-full rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green">
                  {resolveTarget.outcomes.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Type RESOLVE</span>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESOLVE" className="h-9 w-full rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-red focus:ring-1 focus:ring-red" />
              </label>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button type="button" onClick={() => setResolveTarget(null)} className="flex-1 rounded-md border border-line py-2 text-[13px] font-semibold text-fg-muted hover:text-fg hover:bg-bg-above transition">Cancel</button>
              <button
                type="button"
                onClick={submitResolve}
                disabled={confirmText !== "RESOLVE" || isPending}
                className="flex-1 rounded-md bg-red py-2 text-[13px] font-semibold text-white transition hover:bg-red/90 disabled:opacity-50 disabled:hover:bg-red"
              >
                {isPending ? "Executing..." : "Settle Market"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
