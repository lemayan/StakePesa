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
      setMessage({ type: "success", text: "Sector successfully created." })
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
      setMessage({ type: "success", text: "Sector deleted." })
      setTimeout(() => setMessage(null), 3000)
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-bg-above/20 p-5">
        <header className="mb-4">
          <h3 className="text-[16px] font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Sector</h3>
          <p className="text-[13px] text-fg-muted mt-1">Create a new sector to categorize markets.</p>
        </header>

        {message && (
          <div className={`mb-4 rounded-md border p-3 text-[13px] font-semibold ${message.type === "error" ? "border-red/20 bg-red/10 text-red" : "border-green/20 bg-green/10 text-green"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 md:items-end">
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Title</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Crypto" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
          </label>
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Slug</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="crypto" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
          </label>
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Icon</span>
            <input value={iconName} onChange={(e) => setIconName(e.target.value)} placeholder="Currency" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
          </label>
          <button type="submit" disabled={isPending} className="flex h-9 items-center justify-center gap-2 rounded-md bg-fg px-4 text-[13px] font-semibold text-bg transition hover:opacity-90 disabled:opacity-50">
            {isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Create"}
          </button>
        </form>
      </section>

      <section>
        <header className="mb-3 px-1">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold"><FolderTree className="h-4 w-4 text-fg-muted" /> Active Sectors ({sectors.length})</h3>
        </header>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sectors.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-line p-8 text-center text-[13px] text-fg-muted">
              No sectors configured.
            </div>
          )}
          {sectors.map((sector) => (
            <div key={sector.id} className="group flex items-center justify-between rounded-lg border border-line bg-bg p-3 transition hover:border-fg-muted/30 hover:bg-bg-above/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-bg text-fg-secondary">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold">{sector.title}</p>
                  <p className="text-[11px] font-mono text-fg-muted mt-0.5">/{sector.slug}</p>
                </div>
              </div>
              
              <button 
                onClick={() => submitDelete(sector.id)}
                disabled={isPending}
                className="opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center rounded p-2 text-fg-muted hover:bg-red/10 hover:text-red disabled:opacity-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
