import { getAdminDashboardDataAction } from "@/actions/admin"
import { MarketCreationForm } from "@/components/admin/market-creation-form"
import { ActiveMarketsPanel } from "@/components/admin/active-markets-panel"
import { Radar } from "lucide-react"

export default async function AdminMarketsPage() {
  const data = await getAdminDashboardDataAction()
  const highRiskCount = data.activeMarkets.filter((market) => market.imbalance >= 0.8).length

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Markets</h1>
          <p className="text-[13px] text-fg-secondary">
            Manage the lifecycle of live prediction markets and monitor pool imbalances.
          </p>
        </div>
        <div className="shrink-0">
          <MarketCreationForm sectors={data.sectors} />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[12px] font-mono mb-4 text-fg-muted">
        <span className="px-2 py-1 rounded bg-bg-above/50 border border-line">Open: {data.activeMarkets.length}</span>
        {highRiskCount > 0 && <span className="px-2 py-1 rounded bg-red/10 text-red border border-red/20 border-dashed">High Risk: {highRiskCount}</span>}
      </div>

      <div className="w-full">
        <ActiveMarketsPanel markets={data.activeMarkets} />
      </div>
    </section>
  )
}
