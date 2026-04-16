"use client"

import { useState, useTransition } from "react"
import { createSectorAction, deleteSectorAction } from "@/actions/admin"

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
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitCreate() {
    startTransition(async () => {
      const result = await createSectorAction({ title, slug: slug || undefined, iconName })
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage(error)
        return
      }
      setMessage("Sector created.")
      setTitle("")
      setSlug("")
      setIconName("Target")
    })
  }

  function submitDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSectorAction(id)
      const error = (result as { error?: string }).error
      if (typeof error === "string") {
        setMessage(error)
        return
      }
      setMessage("Sector deleted.")
    })
  }

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-bg/90 p-5">
      <header>
        <h3 className="text-xl font-semibold">Sector Management</h3>
        <p className="text-sm text-fg-muted">Create, edit, and remove sectors used by admin markets.</p>
      </header>

      {message && <p className="rounded-xl border border-green/25 bg-green/10 px-3 py-2 text-sm text-green">{message}</p>}

      <div className="grid gap-2 md:grid-cols-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sector title" className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
        <input value={iconName} onChange={(e) => setIconName(e.target.value)} placeholder="Lucide icon" className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
        <button onClick={submitCreate} disabled={isPending} className="h-10 rounded-xl bg-green text-sm font-semibold text-white disabled:opacity-50">Create Sector</button>
      </div>

      <div className="space-y-2">
        {sectors.map((sector) => (
          <div key={sector.id} className="flex items-center justify-between rounded-2xl border border-line bg-bg-above/50 px-3 py-2.5">
            <div>
              <p className="font-semibold">{sector.title}</p>
              <p className="text-xs text-fg-muted">{sector.slug} · icon {sector.iconName}</p>
            </div>
            <button onClick={() => submitDelete(sector.id)} className="rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs font-semibold text-red">Delete</button>
          </div>
        ))}
      </div>
    </section>
  )
}
