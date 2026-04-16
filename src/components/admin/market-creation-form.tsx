"use client"

import { useMemo, useState, useTransition } from "react"
import { createAdminMarketAction } from "@/actions/admin"

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

const STEP_TITLES = ["Metadata", "Timing", "Pari-Mutuel & Outcomes", "Review"] as const

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
    setOutcomes((prev) => prev.map((outcome) => (outcome.id === id ? { ...outcome, ...patch } : outcome)))
  }

  function addOutcome() {
    setOutcomes((prev) => [...prev, { id: crypto.randomUUID(), name: "", seedStakeCents: 0 }])
  }

  function removeOutcome(id: string) {
    setOutcomes((prev) => (prev.length <= 2 ? prev : prev.filter((outcome) => outcome.id !== id)))
  }

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (title.trim().length < 6) return "Title must be at least 6 characters."
      if (!sectorId) return "Select a sector."
    }
    if (step === 1) {
      const startsAt = new Date(startsAtLocal)
      const closesAt = new Date(closesAtLocal)
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(closesAt.getTime())) {
        return "Invalid date value."
      }
      if (closesAt <= startsAt) return "closesAt must be after startsAt."
    }
    if (step === 2) {
      if (outcomes.length < 2) return "At least two outcomes are required."
      if (outcomes.some((outcome) => outcome.name.trim().length < 1)) {
        return "All outcomes must have a name."
      }
      if (houseMarginBps < 0 || houseMarginBps > 2000) {
        return "House margin must be between 0 and 2000 bps."
      }
    }
    return null
  }

  function goNext() {
    const validationError = validateCurrentStep()
    setError(validationError)
    if (validationError) return
    setStep((prev) => Math.min(prev + 1, STEP_TITLES.length - 1))
  }

  function goBack() {
    setError(null)
    setStep((prev) => Math.max(prev - 1, 0))
  }

  function handleSubmit() {
    const validationError = validateCurrentStep()
    setError(validationError)
    if (validationError) return

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
        outcomes: outcomes.map((outcome) => ({
          name: outcome.name.trim(),
          seedStakeCents: Math.max(0, Math.trunc(outcome.seedStakeCents)),
        })),
      })

      if ("error" in result && result.error) {
        setError(result.error)
        return
      }

      setError(null)
      setSuccess(`Market created successfully: ${result.marketId}`)
      setStep(0)
      setTitle("")
      setDescription("")
      setImageUrl("")
      setStartsAtLocal(formatLocalDateValue(new Date(Date.now() + 10 * 60 * 1000)))
      setClosesAtLocal(formatLocalDateValue(new Date(Date.now() + 24 * 60 * 60 * 1000)))
      setHouseMarginBps(500)
      setTrending(false)
      setIsActive(true)
      setOutcomes([
        { id: crypto.randomUUID(), name: "Yes", seedStakeCents: 0 },
        { id: crypto.randomUUID(), name: "No", seedStakeCents: 0 },
      ])
    })
  }

  return (
    <section className="rounded-3xl border border-line bg-bg/90 p-5">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">Create Market Engine</h2>
        <p className="text-sm text-fg-muted">Multi-step market creation with timing and pari-mutuel seed controls.</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {STEP_TITLES.map((titleText, index) => (
          <span
            key={titleText}
            className={`rounded-full border px-3 py-1 text-xs font-mono ${index === step ? "border-green/30 bg-green/10 text-green" : "border-line bg-bg text-fg-muted"}`}
          >
            {index + 1}. {titleText}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs font-mono text-fg-muted">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs font-mono text-fg-muted">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 rounded-xl border border-line bg-bg px-3 py-2 outline-none transition focus:border-green/50" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-mono text-fg-muted">Sector</span>
            <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50">
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>{sector.title}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-mono text-fg-muted">Image URL (UploadThing/Cloudinary)</span>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-mono text-fg-muted">Starts At (local timezone)</span>
            <input type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-mono text-fg-muted">Closes At (local timezone)</span>
            <input type="datetime-local" value={closesAtLocal} onChange={(e) => setClosesAtLocal(e.target.value)} className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-mono text-fg-muted">House Margin (BPS)</span>
              <input type="number" value={houseMarginBps} onChange={(e) => setHouseMarginBps(Number(e.target.value))} className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2">
              <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} />
              <span className="text-sm">Trending</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span className="text-sm">Active</span>
            </label>
          </div>

          <div className="space-y-2 rounded-2xl border border-line bg-bg-above/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Outcomes</p>
              <button type="button" onClick={addOutcome} className="rounded-full bg-green px-3 py-1 text-xs font-semibold text-white">Add Outcome</button>
            </div>
            {outcomes.map((outcome, index) => (
              <div key={outcome.id} className="grid gap-2 md:grid-cols-[1fr_180px_120px]">
                <input
                  value={outcome.name}
                  onChange={(e) => updateOutcome(outcome.id, { name: e.target.value })}
                  placeholder={`Outcome ${index + 1}`}
                  className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50"
                />
                <input
                  type="number"
                  value={outcome.seedStakeCents}
                  onChange={(e) => updateOutcome(outcome.id, { seedStakeCents: Number(e.target.value) })}
                  placeholder="Seed stake cents"
                  className="h-10 rounded-xl border border-line bg-bg px-3 outline-none transition focus:border-green/50"
                />
                <button
                  type="button"
                  onClick={() => removeOutcome(outcome.id)}
                  disabled={outcomes.length <= 2}
                  className="h-10 rounded-xl border border-red/30 bg-red/10 text-sm font-semibold text-red disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
            <p className="text-xs font-mono text-fg-muted">Total seed stake: {totalSeed.toLocaleString()} cents</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2 rounded-2xl border border-line bg-bg-above/50 p-4 text-sm">
          <p><span className="text-fg-muted">Title:</span> {title}</p>
          <p><span className="text-fg-muted">Sector:</span> {sectors.find((s) => s.id === sectorId)?.title ?? "-"}</p>
          <p><span className="text-fg-muted">Starts:</span> {new Date(startsAtLocal).toLocaleString()}</p>
          <p><span className="text-fg-muted">Closes:</span> {new Date(closesAtLocal).toLocaleString()}</p>
          <p><span className="text-fg-muted">House Margin:</span> {houseMarginBps} bps</p>
          <p><span className="text-fg-muted">Outcomes:</span> {outcomes.map((o) => o.name).join(", ")}</p>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
      {success && <p className="mt-3 rounded-xl border border-green/30 bg-green/10 px-3 py-2 text-sm text-green">{success}</p>}

      <footer className="mt-4 flex items-center justify-between">
        <button type="button" onClick={goBack} disabled={step === 0 || isPending} className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-50">Back</button>
        {step < STEP_TITLES.length - 1 ? (
          <button type="button" onClick={goNext} disabled={isPending} className="rounded-xl bg-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Next</button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={isPending} className="rounded-xl bg-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Creating..." : "Create Market"}</button>
        )}
      </footer>
    </section>
  )
}
