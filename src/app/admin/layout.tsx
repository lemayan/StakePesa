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
        <aside className="relative flex flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/40 p-5 shadow-2xl backdrop-blur-2xl md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
          {/* Subtle gradient blob for the sidebar */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-green/20 blur-[60px]" />
          
          <div className="relative mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green">Command Center</p>
            <p className="mt-1 truncate text-xs font-medium text-white/70">{session.user.email}</p>
          </div>

          <div className="relative flex-1">
            <AdminNav items={nav} />
          </div>

          <div className="relative mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green"></span>
              </span>
              <span className="font-mono text-white/60">Risk Node Active</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-1.5 w-[73%] rounded-full bg-gradient-to-r from-emerald-500 to-green shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            </div>
          </div>
        </aside>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  )
}
