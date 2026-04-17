"use client"

import { useState, useTransition } from "react"
import { createSectorAction, deleteSectorAction } from "@/actions/admin"
import { Plus, Trash2, FolderTree, RefreshCw, Layers } from "lucide-react"

type Sector = {
  id: string
  title: string
  slug: string
  iconName: string
}

type Props = {
  sectors: Sector[]
}

export function SectorManagementPanel({ sectors }: Props) {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [iconName, setIconName] = useState("Target")
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createSectorAction({ title, slug: slug || undefined, iconName })
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage({ type: "error", text: error })
        return
      }
      setMessage({ type: "success", text: "Sector successfully deployed." })
      setTitle("")
      setSlug("")
      setIconName("Target")
      setTimeout(() => setMessage(null), 3000)
    })
  }

  function submitDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSectorAction(id)
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage({ type: "error", text: error })
        return
      }
      setMessage({ type: "success", text: "Sector removed from taxonomy." })
      setTimeout(() => setMessage(null), 3000)
    })
  }

  return (
    <div className="space-y-8">
      {/* Creation Node */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.07]">
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-[60px]" />
        
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white/90">Initialize Taxonomy Node</h3>
            <p className="text-xs text-white/50">Deploy a new sector to group markets.</p>
          </div>
        </header>

        {message && (
          <div className={`mb-6 rounded-xl border p-3 text-sm font-medium ${message.type === "error" ? "border-red/30 bg-red/10 text-red" : "border-green/30 bg-green/10 text-green"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={submitCreate} className="grid gap-4 md:grid-cols-4 md:items-end">
          <label className="grid gap-1.5 md:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Display Title</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Crypto" className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-blue-500 focus:bg-black/60 focus:ring-1 focus:ring-blue-500" />
          </label>
          <label className="grid gap-1.5 md:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Internal Slug</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="crypto" className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-blue-500 focus:bg-black/60 focus:ring-1 focus:ring-blue-500" />
          </label>
          <label className="grid gap-1.5 md:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Lucide Icon</span>
            <input value={iconName} onChange={(e) => setIconName(e.target.value)} placeholder="Currency" className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-blue-500 focus:bg-black/60 focus:ring-1 focus:ring-blue-500" />
          </label>
          <button type="submit" disabled={isPending} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] transition hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 md:col-span-1">
            {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Deploy Sector"}
          </button>
        </form>
      </section>

      {/* Existing Nodes */}
      <section>
        <header className="mb-4 flex items-center justify-between px-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white/80"><FolderTree className="h-4 w-4" /> Active Sector Taxonomy ({sectors.length})</h3>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          {sectors.map((sector) => (
            <div key={sector.id} className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:bg-white/10">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 shadow-inner">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-white/90">{sector.title}</p>
                  <p className="text-xs text-white/40">/{sector.slug} · node: {sector.iconName}</p>
                </div>
              </div>
              
              <button 
                onClick={() => submitDelete(sector.id)}
                disabled={isPending}
                className="opacity-0 transition group-hover:opacity-100 flex items-center justify-center rounded-full h-8 w-8 bg-black/40 text-white/40 border border-white/10 hover:border-red/50 hover:bg-red/10 hover:text-red disabled:opacity-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {sectors.length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
              No sectors deployed in the taxonomy grid.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
