import Link from "next/link"
import { getAdminDashboardDataAction } from "@/actions/admin"
import { Activity, AlertTriangle, BadgeCheck, Wallet } from "lucide-react"

export default async function AdminHomePage() {
  const data = await getAdminDashboardDataAction()

  const totalStakeCents = data.activeMarkets.reduce((sum, market) => sum + market.totalStakeCents, 0)
  const highRiskCount = data.activeMarkets.filter((market) => market.imbalance >= 0.8).length

  return (
    <section className="space-y-6">
      <header className="admin-card relative overflow-hidden rounded-3xl border border-line bg-bg/90 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-green/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-amber/10 blur-2xl" />
        <p className="text-xs font-mono tracking-[0.2em] text-green">ADMIN OVERVIEW</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Market Operations Command Center</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">Control sectors, launch markets, enforce operational risk standards, and resolve outcomes with auditable flows.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <article className="admin-card rounded-2xl border border-line bg-bg/90 p-4">
          <p className="flex items-center gap-1.5 text-xs font-mono text-fg-muted"><Activity className="h-3.5 w-3.5" /> Active Markets</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{data.activeMarkets.length}</p>
        </article>
        <article className="admin-card rounded-2xl border border-line bg-bg/90 p-4">
          <p className="flex items-center gap-1.5 text-xs font-mono text-fg-muted"><BadgeCheck className="h-3.5 w-3.5" /> Resolved Markets</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{data.resolvedMarkets.length}</p>
        </article>
        <article className="admin-card rounded-2xl border border-line bg-bg/90 p-4">
          <p className="flex items-center gap-1.5 text-xs font-mono text-fg-muted"><Wallet className="h-3.5 w-3.5" /> Live Stakes (KES)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{(totalStakeCents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </article>
        <article className="admin-card rounded-2xl border border-red/30 bg-red/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-mono text-fg-muted"><AlertTriangle className="h-3.5 w-3.5" /> High Risk Markets</p>
          <p className="mt-2 text-3xl font-semibold text-red tabular-nums">{highRiskCount}</p>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/admin/markets" className="admin-card rounded-2xl border border-line bg-bg/90 p-4 transition hover:-translate-y-0.5 hover:border-green/40">
          <p className="text-sm font-semibold">Manage Active Markets</p>
          <p className="mt-1 text-xs text-fg-muted">Toggle active state, set trending, and trigger resolution workflow.</p>
        </Link>
        <Link href="/admin/resolved" className="admin-card rounded-2xl border border-line bg-bg/90 p-4 transition hover:-translate-y-0.5 hover:border-green/40">
          <p className="text-sm font-semibold">Review Settlements</p>
          <p className="mt-1 text-xs text-fg-muted">Audit resolved outcomes, settlement timing, and historical throughput.</p>
        </Link>
        <Link href="/admin/settings" className="admin-card rounded-2xl border border-line bg-bg/90 p-4 transition hover:-translate-y-0.5 hover:border-green/40">
          <p className="text-sm font-semibold">Configure Sectors</p>
          <p className="mt-1 text-xs text-fg-muted">Control market taxonomy and category governance.</p>
        </Link>
      </div>
    </section>
  )
}
