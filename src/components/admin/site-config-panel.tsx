"use client"

import { useState, useTransition } from "react"
import { updateSiteConfigAction } from "@/actions/admin"
import { MonitorPlay, Save, CheckCircle2, AlertTriangle } from "lucide-react"

type Props = {
  initialConfig: {
    adText: string | null
    adUrl: string | null
    trendingMessage: string | null
  }
}

export function SiteConfigPanel({ initialConfig }: Props) {
  const [adText, setAdText] = useState(initialConfig.adText ?? "")
  const [adUrl, setAdUrl] = useState(initialConfig.adUrl ?? "")
  const [trendingMessage, setTrendingMessage] = useState(initialConfig.trendingMessage ?? "")
  
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateSiteConfigAction({ adText, adUrl, trendingMessage })
      if ("error" in result && result.error) {
        setMessage({ type: "error", text: result.error })
        return
      }
      setMessage({ type: "success", text: "Global configuration successfully updated and broadcast." })
      setTimeout(() => setMessage(null), 3000)
    })
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-bg-above/20 p-5">
        <header className="mb-4">
          <h3 className="text-[16px] font-semibold flex items-center gap-2"><MonitorPlay className="h-4 w-4" /> Homepage Adjustments</h3>
          <p className="text-[13px] text-fg-muted mt-1">Manage global advertisements and trending messages directly injected into the homepage.</p>
        </header>

        {message && (
          <div className={`mb-4 rounded-md border p-3 text-[13px] font-semibold ${message.type === "error" ? "border-red/20 bg-red/10 text-red" : "border-green/20 bg-green/10 text-green"}`}>
            <div className="flex items-center gap-2">
              {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {message.text}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Homepage Advertisement Text</span>
              <input value={adText} onChange={(e) => setAdText(e.target.value)} placeholder="Sponsored placements coming soon" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
            </label>
            <label className="grid gap-1">
              <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Advertisement Click URL</span>
              <input value={adUrl} onChange={(e) => setAdUrl(e.target.value)} placeholder="https://example.com/ad-track" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
            </label>
          </div>
          
          <label className="grid gap-1">
            <span className="text-[12px] font-semibold text-fg-muted uppercase tracking-wider">Trending Section Status Message</span>
            <input value={trendingMessage} onChange={(e) => setTrendingMessage(e.target.value)} placeholder="Trending prediction markets based on current events" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
          </label>

          <footer className="pt-2 flex justify-end">
            <button type="submit" disabled={isPending} className="flex h-9 items-center justify-center gap-2 rounded-md bg-fg px-4 text-[13px] font-semibold text-bg transition hover:opacity-90 disabled:opacity-50">
              {isPending ? <Save className="h-3 w-3 animate-pulse" /> : <Save className="h-3 w-3" />}
              Save Configuration
            </button>
          </footer>
        </form>
      </div>
    </section>
  )
}
