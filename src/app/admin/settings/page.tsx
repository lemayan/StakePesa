import { getAdminDashboardDataAction } from "@/actions/admin"
import { SectorManagementPanel } from "@/components/admin/sector-management-panel"
import { Settings2 } from "lucide-react"

export default async function AdminSettingsPage() {
  const data = await getAdminDashboardDataAction()

  return (
    <section className="space-y-4">
      <header className="admin-card rounded-3xl border border-line bg-bg/90 p-6">
        <p className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-green"><Settings2 className="h-4 w-4" /> SETTINGS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin Configuration</h1>
        <p className="mt-2 text-sm text-fg-muted">Manage sectors used in market taxonomy and keep naming consistent across operations.</p>
      </header>

      <SectorManagementPanel sectors={data.sectors} />
    </section>
  )
}
