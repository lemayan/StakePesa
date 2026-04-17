import { getAdminDashboardDataAction, getSiteConfigAction } from "@/actions/admin"
import { SectorManagementPanel } from "@/components/admin/sector-management-panel"
import { SiteConfigPanel } from "@/components/admin/site-config-panel"
import { Settings2 } from "lucide-react"

export default async function AdminSettingsPage() {
  const data = await getAdminDashboardDataAction()
  const siteConfig = await getSiteConfigAction()

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Admin Configuration</h1>
        <p className="max-w-2xl text-[13px] text-fg-secondary">
          Manage sectors used in market taxonomy and keep naming consistent across operations.
        </p>
      </header>

      <div className="w-full space-y-8">
        <SiteConfigPanel initialConfig={siteConfig} />
        <SectorManagementPanel sectors={data.sectors} />
      </div>
    </section>
  )
}
