import { getAdminDashboardDataAction } from "@/actions/admin"
import { ArchiveRestore, CheckCircle2, History } from "lucide-react"

export default async function AdminResolvedMarketsPage() {
  const data = await getAdminDashboardDataAction()

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Resolved Markets</h1>
        <p className="max-w-xl text-[13px] text-fg-secondary">
          Immutable log of all manually resolved markets. Reviews winning outcomes for historical auditing and reconciliation.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line bg-bg-above/20">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-line bg-bg text-[12px] uppercase tracking-wider text-fg-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Historical Market</th>
              <th className="px-4 py-3 font-semibold">Sector Node</th>
              <th className="px-4 py-3 font-semibold">Winning Resolution</th>
              <th className="px-4 py-3 font-semibold">Execution Stamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.resolvedMarkets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No execution settlements recorded.
                </td>
              </tr>
            )}
            {data.resolvedMarkets.map((market) => (
              <tr key={market.id} className="hover:bg-bg-above/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-fg-muted" />
                    <span className="font-semibold text-fg">{market.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-bg-above px-2 py-0.5 text-[12px] text-fg border border-line">{market.sector.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded bg-green/10 px-2 py-0.5 text-[12px] font-semibold text-green border border-green/20">
                    <CheckCircle2 className="h-3 w-3" />
                    {market.winningOutcome ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-fg-muted">
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
