import { getAdminDashboardDataAction } from "@/actions/admin"
import { MarketCreationForm } from "@/components/admin/market-creation-form"
import { ActiveMarketsPanel } from "@/components/admin/active-markets-panel"
import { Radar } from "lucide-react"

export default async function AdminMarketsPage() {
  const data = await getAdminDashboardDataAction()
  const highRiskCount = data.activeMarkets.filter((market) => market.imbalance >= 0.8).length

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green/10 blur-[80px]" />
        
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-green">
              <Radar className="h-4 w-4 animate-spin-slow" /> ACTIVE MARKET CONTROL
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white/90">Market Lifecycle & Risk</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-white/70 shadow-inner">
                Open Markets: {data.activeMarkets.length}
              </span>
              <span className="rounded-full border border-red/20 bg-red/10 px-4 py-1.5 text-red shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                High Risk: {highRiskCount}
              </span>
            </div>
          </div>
          
          <div className="shrink-0">
            <MarketCreationForm sectors={data.sectors} />
          </div>
        </div>
      </header>

      <div className="w-full">
        <ActiveMarketsPanel markets={data.activeMarkets} />
      </div>
    </section>
  )
}
