import { getAdminDashboardDataAction } from "@/actions/admin"
import { MarketCreationForm } from "@/components/admin/market-creation-form"
import { TrendingMarketsPanel } from "@/components/admin/trending-markets-panel"

export default async function AdminTrendingPage() {
  const data = await getAdminDashboardDataAction()

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Homepage Sliders</h1>
          <p className="text-[13px] text-fg-secondary">
            Manage which active markets appear in the hero section sliders on the homepage.
          </p>
        </div>
        <div className="shrink-0">
          <MarketCreationForm sectors={data.sectors} />
        </div>
      </div>

      <div className="w-full">
        <TrendingMarketsPanel markets={data.activeMarkets} />
      </div>
    </section>
  )
}
