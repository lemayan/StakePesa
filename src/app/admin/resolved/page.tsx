import { getAdminDashboardDataAction } from "@/actions/admin"
import { ArchiveRestore } from "lucide-react"

export default async function AdminResolvedMarketsPage() {
  const data = await getAdminDashboardDataAction()

  return (
    <section className="space-y-4">
      <header className="admin-card rounded-3xl border border-line bg-bg/90 p-6">
        <p className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-green"><ArchiveRestore className="h-4 w-4" /> RESOLVED MARKETS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settlement History</h1>
        <p className="mt-2 text-sm text-fg-muted">Review historical resolutions and winning outcomes for audit and reconciliation.</p>
      </header>

      <div className="overflow-hidden rounded-3xl border border-line bg-bg/90">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-bg">
            <tr>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Winning Outcome</th>
              <th className="px-4 py-3">Resolved At</th>
            </tr>
          </thead>
          <tbody>
            {data.resolvedMarkets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-fg-muted">
                  No resolved markets yet.
                </td>
              </tr>
            )}
            {data.resolvedMarkets.map((market) => (
              <tr key={market.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{market.title}</td>
                <td className="px-4 py-3 text-fg-muted">{market.sector.title}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-green/25 bg-green/10 px-2 py-1 text-xs font-semibold text-green">
                    {market.winningOutcome ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-fg-muted">{market.resolvedAt ? new Date(market.resolvedAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
