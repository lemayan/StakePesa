import { getAdminDashboardDataAction } from "@/actions/admin"
import { MarketCreationForm } from "@/components/admin/market-creation-form"
import { ActiveMarketsPanel } from "@/components/admin/active-markets-panel"
import { Radar } from "lucide-react"

export default async function AdminMarketsPage() {
  const data = await getAdminDashboardDataAction()
  const highRiskCount = data.activeMarkets.filter((market) => market.imbalance >= 0.8).length

  return (
    <section className="space-y-5">
      <header className="admin-card rounded-3xl border border-line bg-bg/90 p-6">
        <p className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-green"><Radar className="h-4 w-4" /> ACTIVE MARKET CONTROL</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Market Lifecycle and Risk Desk</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
          <span className="rounded-full border border-line bg-bg-above px-3 py-1 text-fg-muted">Open Markets: {data.activeMarkets.length}</span>
          <span className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-red">High Risk: {highRiskCount}</span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <MarketCreationForm sectors={data.sectors} />
        <ActiveMarketsPanel markets={data.activeMarkets} />
      </div>
    </section>
  )
}
