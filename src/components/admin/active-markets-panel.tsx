"use client"

import { useOptimistic, useState, useTransition } from "react"
import { resolveAdminMarketAction, toggleMarketActiveAction, toggleTrendingAction } from "@/actions/admin"
import { Play, Pause, Flame, GripVertical, AlertTriangle, Coins, CheckCircle2, ShieldAlert } from "lucide-react"

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
        setMessage({ type: "error", text: error })
      }
    })
  }

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
    <div className="space-y-6">
      {message && (
        <div className={`rounded-xl border p-4 backdrop-blur-md ${message.type === "error" ? "border-red/20 bg-red/10 text-red shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-green/20 bg-green/10 text-green shadow-[0_0_15px_rgba(34,197,94,0.1)]"}`}>
          <div className="flex items-center gap-2 font-semibold">
            {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            {message.text}
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-black/40 shadow-xl backdrop-blur-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/50">
            <tr>
              <th className="px-6 py-4 font-bold">Market / Sector</th>
              <th className="px-6 py-4 font-bold">Pool / Imbalance</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {optimisticMarkets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-white/30 font-mono">
                  No active markets in the node.
                </td>
              </tr>
            )}
            {optimisticMarkets.map((market) => (
              <tr key={market.id} className="group transition hover:bg-white/[0.02]">
                {/* Column 1: Market Map */}
                <td className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-white/20 group-hover:text-white/40 transition"><GripVertical className="h-4 w-4" /></div>
                    <div>
                      <p className="font-bold text-white/90 max-w-[300px] truncate" title={market.title}>{market.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{market.sector.title} · TTL: {new Date(market.closesAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </td>

                {/* Column 2: Risk Imbalance */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/50 shadow-inner">
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-[13px] font-medium text-white/80">
                        {((market.totalStakeCents || 0) / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })} KES
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${market.imbalance >= 0.8 ? "animate-pulse bg-red shadow-[0_0_8px_rgba(239,68,68,0.8)]" : market.imbalance >= 0.6 ? "bg-amber shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "bg-green text-transparent"}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${market.imbalance >= 0.8 ? "text-red" : market.imbalance >= 0.6 ? "text-amber" : "text-white/40"}`}>
                          {market.riskSummary}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Column 3: Status Toggles */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTrending(market.id, !market.trending)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${market.trending ? "border-amber/20 bg-amber/10 text-amber shadow-[0_0_10px_rgba(251,191,36,0.15)]" : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}
                    >
                      <Flame className="h-3 w-3" /> {market.trending ? "Hot" : "Cold"}
                    </button>
                    <button
                      onClick={() => setActive(market.id, !market.isActive)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${market.isActive ? "border-green/20 bg-green/10 text-green shadow-[0_0_10px_rgba(34,197,94,0.15)]" : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}
                    >
                      {market.isActive ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {market.isActive ? "Live" : "Paused"}
                    </button>
                  </div>
                </td>

                {/* Column 4: Ops */}
                <td className="px-6 py-5 text-right">
                  <button
                    onClick={() => {
                      setResolveTarget(market)
                      setWinningOutcome(market.outcomes[0]?.name ?? "")
                    }}
                    className="group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white shadow-inner transition hover:scale-105 hover:bg-white hover:text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    <ShieldAlert className="h-4 w-4 text-red transition group-hover/btn:text-red" />
                    Force Settlement
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Premium Resolve Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setResolveTarget(null)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-red/20 bg-[#111] p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-red/20 blur-[60px]" />
            
            <div className="relative text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red/20 bg-red/10 text-red shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h4 className="text-2xl font-black text-white">Resolve Market Node</h4>
              <p className="mt-2 text-sm font-medium text-red/80">CAUTION: This executes instantaneous, irreversible financial settlement parsing across all ledgers.</p>
            </div>

            <div className="relative mt-8 space-y-6">
              <div className="rounded-2xl border border-white/5 bg-black/50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40 text-center mb-1">Target Market</p>
                <p className="font-mono text-sm text-center text-white/90">{resolveTarget.title}</p>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Declare Winning Outcome</span>
                <div className="relative">
                  <select value={winningOutcome} onChange={(e) => setWinningOutcome(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 pr-10 text-white outline-none transition focus:border-red focus:bg-red/5 focus:ring-1 focus:ring-red">
                    {resolveTarget.outcomes.map((o) => (
                      <option key={o.name} value={o.name} className="bg-[#111] text-white">{o.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/40">▼</div>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Type <strong className="text-red">RESOLVE</strong> to execute</span>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type RESOLVE" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-red focus:bg-red/5 focus:ring-1 focus:ring-red" />
              </label>
            </div>

            <div className="relative mt-8 flex items-center gap-3">
              <button type="button" onClick={() => setResolveTarget(null)} className="flex-1 rounded-xl border border-white/10 py-3 font-bold text-white/60 transition hover:bg-white/5 hover:text-white">Cancel Abort</button>
              <button
                type="button"
                onClick={submitResolve}
                disabled={confirmText !== "RESOLVE" || isPending}
                className="flex-[2] rounded-xl bg-red py-3 font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition hover:bg-red/90 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] disabled:opacity-30 disabled:shadow-none"
              >
                {isPending ? "Executing Settlement Ledger..." : "EXECUTE SETTLEMENT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
