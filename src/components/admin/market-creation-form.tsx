"use client"

import { useMemo, useState, useTransition } from "react"
import { createAdminMarketAction } from "@/actions/admin"
import { SideSheet } from "@/components/ui/side-sheet"
import { ImagePreviewInput } from "@/components/ui/image-preview-input"
import { Loader2 } from "lucide-react"

type SectorOption = {
  id: string
  title: string
  slug: string
}

type OutcomeInput = {
  id: string
  name: string
  imageUrl?: string
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
    { id: crypto.randomUUID(), name: "Yes", imageUrl: "", seedStakeCents: 0 },
    { id: crypto.randomUUID(), name: "No", imageUrl: "", seedStakeCents: 0 },
  ])

  const totalSeed = useMemo(
    () => outcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.seedStakeCents), 0),
    [outcomes]
  )

  function updateOutcome(id: string, patch: Partial<OutcomeInput>) {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  function addOutcome() {
    setOutcomes((prev) => [...prev, { id: crypto.randomUUID(), name: "", imageUrl: "", seedStakeCents: 0 }])
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
          imageUrl: o.imageUrl?.trim() || undefined,
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
        className="h-8 px-4 text-[13px] font-semibold rounded-md bg-green text-white flex items-center shadow hover:opacity-90 transition"
      >
        Initialize Market
      </button>

      <SideSheet
        isOpen={isOpen}
        onClose={() => !isPending && setIsOpen(false)}
        title="Initialize New Market"
      >
        <div className="flex flex-col h-full bg-transparent">
          <div className="mb-6 flex gap-1">
            {STEP_TITLES.map((titleText, index) => (
              <div 
                key={titleText} 
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${index <= step ? 'bg-green' : 'bg-line'}`} 
              />
            ))}
          </div>

          <div className="flex-1 space-y-6">
            <h3 className="text-sm font-semibold">{STEP_TITLES[step]}</h3>

            {step === 0 && (
              <div className="space-y-4">
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Market Title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Will ETH break $4000?" className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Resolution Criteria</span>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Exhaustive rules for settlement..." className="min-h-[80px] rounded-md border border-line bg-bg px-3 py-2 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Sector Taxonomy</span>
                  <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green">
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>{sector.title}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Cover Artwork (Premium URL Preview)</span>
                  <ImagePreviewInput value={imageUrl} onChange={setImageUrl} />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Starts At</span>
                  <input type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">Closes At</span>
                  <input type="datetime-local" value={closesAtLocal} onChange={(e) => setClosesAtLocal(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-fg-muted">House Edge (Bps)</span>
                    <input type="number" value={houseMarginBps} onChange={(e) => setHouseMarginBps(Number(e.target.value))} className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green focus:ring-1 focus:ring-green" />
                  </label>
                  <div className="flex flex-col gap-2 justify-end pb-1">
                    <label className="flex items-center gap-2 rounded-md bg-bg-above/50 px-3 py-1.5 border border-line cursor-pointer">
                      <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="accent-green h-3 w-3" />
                      <span className="text-[12px] font-semibold text-fg-secondary">Force Trending</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md bg-green/10 px-3 py-1.5 border border-green/20 cursor-pointer">
                      <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-green h-3 w-3" />
                      <span className="text-[12px] font-semibold text-green">Market Active</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-bg-above/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold text-fg">Resolution Outcomes</h4>
                    <button type="button" onClick={addOutcome} className="text-[11px] font-semibold text-fg-muted border border-line bg-bg px-2 py-0.5 rounded hover:text-fg hover:bg-bg-above">Add Outcome</button>
                  </div>
                  
                  {outcomes.map((o, i) => (
                    <div key={o.id} className="space-y-2 pb-3 border-b border-line last:border-b-0 last:pb-0">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center group">
                        <input
                          value={o.name}
                          onChange={(e) => updateOutcome(o.id, { name: e.target.value })}
                          placeholder={`Outcome ${i + 1} Name`}
                          className="h-9 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green"
                        />
                        <input
                          type="number"
                          value={o.seedStakeCents}
                          onChange={(e) => updateOutcome(o.id, { seedStakeCents: Number(e.target.value) })}
                          placeholder="Seed (Cents)"
                          className="h-9 w-24 rounded-md border border-line bg-bg px-3 text-[13px] text-fg outline-none focus:border-green"
                        />
                        <button
                          type="button"
                          onClick={() => removeOutcome(o.id)}
                          disabled={outcomes.length <= 2}
                          className="p-1.5 text-fg-muted hover:text-red transition disabled:opacity-30 disabled:hover:text-fg-muted"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <ImagePreviewInput value={o.imageUrl || ""} onChange={(val) => updateOutcome(o.id, { imageUrl: val })} placeholder={`Avatar URL for ${o.name || `Outcome ${i + 1}`}`} />
                    </div>
                  ))}
                  
                  <div className="pt-2 border-t border-line flex justify-between text-[12px] font-mono">
                    <span className="text-fg-muted">Pool Injection:</span>
                    <span className="font-semibold text-green">{(totalSeed / 100).toFixed(2)} KES</span>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-line bg-bg-above/20 p-4 space-y-3 font-mono text-[12px]">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-fg-muted">Title</span>
                    <span className="col-span-2 text-fg">{title}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-fg-muted">Sector</span>
                    <span className="col-span-2 text-fg">{sectors.find((s) => s.id === sectorId)?.title ?? "-"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-fg-muted">Lifespan</span>
                    <span className="col-span-2 text-green">
                      {new Date(startsAtLocal).toLocaleString()} <br/>
                      {new Date(closesAtLocal).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-fg-muted">Config</span>
                    <span className="col-span-2 text-fg">{houseMarginBps} bps margin | {outcomes.length} outcomes</span>
                  </div>
                </div>
                
                {error && <div className="rounded-md border border-red/20 bg-red/10 p-3 text-[13px] text-red font-medium">{error}</div>}
                {success && <div className="rounded-md border border-green/20 bg-green/10 p-4 text-center">
                   <div className="text-green font-semibold text-[13px] mb-1">Deployment Confirmed</div>
                   <div className="text-[12px] text-green font-mono">{success}</div>
                </div>}
              </div>
            )}
          </div>

          <footer className="mt-8 pt-4 border-t border-line flex justify-between gap-3">
            <button 
              type="button" 
              onClick={goBack} 
              disabled={step === 0 || isPending || !!success} 
              className="px-4 py-2 rounded-md text-[13px] font-semibold text-fg-muted hover:text-fg hover:bg-bg-above transition border border-transparent disabled:opacity-30"
            >
              Back
            </button>
            {step < STEP_TITLES.length - 1 ? (
              <button 
                type="button" 
                onClick={goNext} 
                className="flex-1 bg-fg text-bg px-4 py-2 rounded-md text-[13px] font-semibold hover:opacity-90 transition"
              >
                Continue
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={isPending || !!success} 
                className="flex flex-1 items-center justify-center gap-2 bg-green px-4 py-2 rounded-md text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deploy Market"}
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
