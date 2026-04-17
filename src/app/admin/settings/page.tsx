import { getAdminDashboardDataAction } from "@/actions/admin"
import { SectorManagementPanel } from "@/components/admin/sector-management-panel"
import { Settings2 } from "lucide-react"

export default async function AdminSettingsPage() {
  const data = await getAdminDashboardDataAction()

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
        
        <div className="relative">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            <Settings2 className="h-4 w-4" /> CONFIGURATION NODE
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white/90">Taxonomy & Sectors</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            Manage global sector configurations. Changes here propagate instantly across the platform, affecting market categorization and user filters.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl">
        <SectorManagementPanel sectors={data.sectors} />
      </div>
    </section>
  )
}
