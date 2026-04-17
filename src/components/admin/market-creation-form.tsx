"use client"

import { useMemo, useState, useTransition } from "react"
import { createAdminMarketAction } from "@/actions/admin"
import { SideSheet } from "@/components/ui/side-sheet"
import { ImagePreviewInput } from "@/components/ui/image-preview-input"
import { Plus, Loader2 } from "lucide-react"

type SectorOption = {
  id: string
  title: string
  slug: string
}

type OutcomeInput = {
  id: string
  name: string
  seedStakeCents: number
}

type Props = {
  sectors: SectorOption[]
}

const STEP_TITLES = ["Metadata", "Timing", "Pari-Mutuel", "Review"] as const

function formatLocalDateValue(date: Date) {
  const pad = (v: number) => `${v}`.padStart(2, "0")
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export function MarketCreationForm({ sectors }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? "")
  const [startsAtLocal, setStartsAtLocal] = useState(formatLocalDateValue(new Date(Date.now() + 10 * 60 * 1000)))
  const [closesAtLocal, setClosesAtLocal] = useState(formatLocalDateValue(new Date(Date.now() + 24 * 60 * 60 * 1000)))
  const [houseMarginBps, setHouseMarginBps] = useState(500)
  const [trending, setTrending] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [outcomes, setOutcomes] = useState<OutcomeInput[]>([
    { id: crypto.randomUUID(), name: "Yes", seedStakeCents: 0 },
    { id: crypto.randomUUID(), name: "No", seedStakeCents: 0 },
  ])

  const totalSeed = useMemo(
    () => outcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.seedStakeCents), 0),
    [outcomes]
  )

  function updateOutcome(id: string, patch: Partial<OutcomeInput>) {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  function addOutcome() {
    setOutcomes((prev) => [...prev, { id: crypto.randomUUID(), name: "", seedStakeCents: 0 }])
  }

  function removeOutcome(id: string) {
    setOutcomes((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.id !== id)))
  }

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (title.trim().length < 6) return "Title must be at least 6 characters."
      if (!sectorId) return "Select a sector."
    }
    if (step === 1) {
      const startsAt = new Date(startsAtLocal)
      const closesAt = new Date(closesAtLocal)
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(closesAt.getTime())) return "Invalid date value."
      if (closesAt <= startsAt) return "closesAt must be after startsAt."
    }
    if (step === 2) {
      if (outcomes.length < 2) return "At least two outcomes are required."
      if (outcomes.some((o) => o.name.trim().length < 1)) return "All outcomes must have a name."
      if (houseMarginBps < 0 || houseMarginBps > 2000) return "House margin must be between 0 and 2000 bps."
    }
    return null
  }

  function goNext() {
    const err = validateCurrentStep()
    setError(err)
    if (err) return
    setStep((prev) => Math.min(prev + 1, STEP_TITLES.length - 1))
  }

  function goBack() {
    setError(null)
    setStep((prev) => Math.max(prev - 1, 0))
  }

  function handleSubmit() {
    const err = validateCurrentStep()
    setError(err)
    if (err) return

    setSuccess(null)
    startTransition(async () => {
      const result = await createAdminMarketAction({
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        sectorId,
        startsAt: new Date(startsAtLocal).toISOString(),
        closesAt: new Date(closesAtLocal).toISOString(),
        houseMarginBps,
        trending,
        isActive,
        outcomes: outcomes.map((o) => ({
          name: o.name.trim(),
          seedStakeCents: Math.max(0, Math.trunc(o.seedStakeCents)),
        })),
      })

      if ("error" in result && result.error) {
        setError(result.error)
        return
      }

      setError(null)
      setSuccess(`Market created successfully: ${result.marketId}`)
      
      // Auto close after success
      setTimeout(() => {
        setIsOpen(false)
        setStep(0)
        setTitle("")
        setDescription("")
        setImageUrl("")
        setSuccess(null)
      }, 1500)
    })
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-green px-6 py-3 font-semibold text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] transition hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
      >
        <span className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100" />
        <Plus className="h-5 w-5" />
        <span>Initialize Market</span>
      </button>

      <SideSheet
        isOpen={isOpen}
        onClose={() => !isPending && setIsOpen(false)}
        title="Initialize New Market"
        description="Deploy a new prediction market into the risk node."
      >
        <div className="flex flex-col h-full bg-transparent">
          <div className="mb-6 flex gap-1">
            {STEP_TITLES.map((titleText, index) => (
              <div 
                key={titleText} 
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${index <= step ? 'bg-green shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-white/5'}`} 
              />
            ))}
          </div>

          <div className="flex-1 space-y-6">
            <h3 className="text-xl font-bold text-white/90">{STEP_TITLES[step]}</h3>

            {step === 0 && (
              <div className="space-y-4">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Market Title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Will ETH break $4000?" className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-white placeholder:text-white/20 outline-none transition focus:border-green focus:bg-black/40 focus:ring-1 focus:ring-green" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Resolution Criteria (Description)</span>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Exhaustive rules for settlement..." className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-white/20 outline-none transition focus:border-green focus:bg-black/40 focus:ring-1 focus:ring-green" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Sector Taxonomy</span>
                  <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#151515] px-3 text-white outline-none transition focus:border-green focus:ring-1 focus:ring-green">
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>{sector.title}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Cover Artwork (Premium URL Preview)</span>
                  <ImagePreviewInput value={imageUrl} onChange={setImageUrl} />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Starts At (Trading Opens)</span>
                  <input type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-white outline-none transition focus:border-green focus:ring-1 focus:ring-green" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Closes At (Trading Halts)</span>
                  <input type="datetime-local" value={closesAtLocal} onChange={(e) => setClosesAtLocal(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-white outline-none transition focus:border-green focus:ring-1 focus:ring-green" />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/50">House Edge (Bps)</span>
                    <input type="number" value={houseMarginBps} onChange={(e) => setHouseMarginBps(Number(e.target.value))} className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-white outline-none transition focus:border-green focus:ring-1 focus:ring-green" />
                  </label>
                  <div className="flex flex-col gap-2 justify-end pb-1">
                    <label className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10 transition">
                      <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="accent-green h-4 w-4" />
                      <span className="text-sm font-medium text-white/80">Force Trending</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg bg-green/10 px-3 py-2 cursor-pointer hover:bg-green/20 border border-green/20 transition">
                      <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-green h-4 w-4" />
                      <span className="text-sm font-medium text-green">Market Active</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white/80">Resolution Outcomes</h4>
                    <button type="button" onClick={addOutcome} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20">Add Outcome</button>
                  </div>
                  
                  {outcomes.map((o, i) => (
                    <div key={o.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center group">
                      <input
                        value={o.name}
                        onChange={(e) => updateOutcome(o.id, { name: e.target.value })}
                        placeholder={`Outcome ${i + 1} Name`}
                        className="h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-green"
                      />
                      <input
                        type="number"
                        value={o.seedStakeCents}
                        onChange={(e) => updateOutcome(o.id, { seedStakeCents: Number(e.target.value) })}
                        placeholder="Seed (Cents)"
                        className="h-10 w-28 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-green"
                      />
                      <button
                        type="button"
                        onClick={() => removeOutcome(o.id)}
                        disabled={outcomes.length <= 2}
                        className="p-2 text-white/30 hover:text-red transition disabled:opacity-30 disabled:hover:text-white/30"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs text-white/50 font-mono">
                    <span>Pool Injection:</span>
                    <span className="font-bold text-green">{(totalSeed / 100).toFixed(2)} KES</span>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-white/40">Title</span>
                    <span className="col-span-2 text-white">{title}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-white/40">Sector</span>
                    <span className="col-span-2 text-white">{sectors.find((s) => s.id === sectorId)?.title ?? "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-white/40">Lifespan</span>
                    <span className="col-span-2 text-green">
                      {new Date(startsAtLocal).toLocaleString()} <br/>
                      {new Date(closesAtLocal).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-white/40">Config</span>
                    <span className="col-span-2 text-white">{houseMarginBps} bps margin | {outcomes.length} outcomes</span>
                  </div>
                </div>
                
                {error && <div className="rounded-xl border border-red/30 bg-red/10 p-3 text-sm text-red font-medium">{error}</div>}
                {success && <div className="rounded-xl border border-green/30 bg-green/10 p-4 text-center">
                   <div className="text-green font-bold mb-1">Deployment Confirmed</div>
                   <div className="text-xs text-green/70 font-mono">{success}</div>
                </div>}
              </div>
            )}
          </div>

          <footer className="mt-8 pt-4 border-t border-white/10 flex justify-between gap-3">
            <button 
              type="button" 
              onClick={goBack} 
              disabled={step === 0 || isPending || !!success} 
              className="px-5 py-2.5 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-30"
            >
              Back
            </button>
            {step < STEP_TITLES.length - 1 ? (
              <button 
                type="button" 
                onClick={goNext} 
                className="flex-1 bg-white px-5 py-2.5 rounded-xl font-bold text-black shadow-lg shadow-white/10 hover:shadow-white/20 transition active:scale-95"
              >
                Continue Workflow
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={isPending || !!success} 
                className="flex flex-1 items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green px-5 py-2.5 rounded-xl font-bold text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deploy Market"}
              </button>
            )}
          </footer>
        </div>
      </SideSheet>
    </>
  )
}

function X(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
