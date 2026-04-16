import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AdminNav } from "@/components/admin/admin-nav"
import type { NavItem } from "@/components/admin/admin-nav"

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", iconKey: "dashboard" },
  { href: "/admin/markets", label: "Active Markets", iconKey: "markets" },
  { href: "/admin/resolved", label: "Resolved Markets", iconKey: "resolved" },
  { href: "/admin/settings", label: "Settings", iconKey: "settings" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-bg bg-grid bg-admin-mesh">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="admin-card rounded-3xl border border-line bg-bg/90 p-4 md:sticky md:top-4 md:h-fit">
          <div className="mb-4 rounded-2xl border border-green/25 bg-gradient-to-r from-green/10 to-amber/10 p-3">
            <p className="text-xs font-mono tracking-[0.18em] text-green">ADMIN COMMAND CENTER</p>
            <p className="mt-2 truncate text-xs text-fg-secondary">{session.user.email}</p>
          </div>

          <AdminNav items={nav} />

          <div className="mt-4 rounded-2xl border border-line bg-bg-above/50 p-3 text-xs text-fg-muted">
            Settlement and risk controls are live.
            <div className="mt-2 h-1.5 w-full rounded-full bg-bg">
              <div className="h-1.5 w-2/3 rounded-full bg-green animate-fill" />
            </div>
          </div>
        </aside>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  )
}
