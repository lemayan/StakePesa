import { getAdminDashboardDataAction } from "@/actions/admin"
import { ArchiveRestore, CheckCircle2, History } from "lucide-react"

export default async function AdminResolvedMarketsPage() {
  const data = await getAdminDashboardDataAction()

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px]" />
        
        <div className="relative">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
            <ArchiveRestore className="h-4 w-4" /> SETTLEMENT HISTORY
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white/90">Resolved Index</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            Immutable log of all manually resolved markets. Reviews winning outcomes for historical auditing and reconciliation.
          </p>
        </div>
      </header>

      <div className="overflow-x-auto rounded-[2rem] border border-white/5 bg-black/40 shadow-xl backdrop-blur-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/50">
            <tr>
              <th className="px-6 py-4 font-bold">Historical Market</th>
              <th className="px-6 py-4 font-bold">Sector Node</th>
              <th className="px-6 py-4 font-bold">Winning Resolution</th>
              <th className="px-6 py-4 font-bold">Execution Stamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.resolvedMarkets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-white/30 font-mono">
                  No execution settlements recorded.
                </td>
              </tr>
            )}
            {data.resolvedMarkets.map((market) => (
              <tr key={market.id} className="group transition hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-white/20" />
                    <span className="font-bold text-white/80">{market.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-white/50 border border-white/5">{market.sector.title}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green/20 bg-green/10 px-3 py-1 text-xs font-bold text-green shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                    <CheckCircle2 className="h-3 w-3" />
                    {market.winningOutcome ?? "-"}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-white/40">
                  {market.resolvedAt ? new Date(market.resolvedAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
