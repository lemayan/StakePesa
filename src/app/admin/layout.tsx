import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AdminNav } from "@/components/admin/admin-nav"
import type { NavItem } from "@/components/admin/admin-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", iconKey: "dashboard" },
  { href: "/admin/trending", label: "Sliders", iconKey: "sliders" },
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
    <div className="min-h-screen bg-bg">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 md:grid-cols-[260px_1fr]">
        <aside className="border border-line rounded-lg p-4 bg-bg-above/20 md:sticky md:top-6 md:h-[calc(100vh-3rem)] flex flex-col">
          <div className="mb-6 border-b border-line pb-4 flex items-start justify-between">
            <div>
              <p className="text-[13px] font-mono uppercase tracking-wider text-fg-muted">Command Center</p>
              <p className="mt-1 truncate text-[14px] font-medium text-fg">{session.user.email}</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="relative flex-1">
            <AdminNav items={nav} />
          </div>

          <div className="mt-8 rounded-md border border-line bg-bg p-3 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-livepulse rounded-full bg-green opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green"></span>
              </span>
              <span className="font-mono text-fg-muted">Risk Node Active</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-line">
              <div className="h-1 w-[73%] rounded-full bg-green" />
            </div>
          </div>
        </aside>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  )
}
