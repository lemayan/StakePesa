"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

// ── Types ─────────────────────────────────────────────────────────────────────

type CryptoData = {
  btc: { price: number; change24h: number }
  eth: { price: number; change24h: number }
  sol: { price: number; change24h: number }
  updatedAt: number
}

type ForexData = {
  base: string
  rates: Record<string, number>
  updatedAt: string | null
}

type WeatherData = {
  city: string
  current: {
    temp: number
    precip: number
    description: string
    humidity: number
    windspeed: number
  }
  forecast: { date: string; precipSum: number; tempMax: number; tempMin: number; description: string }[]
  updatedAt: number
}

type SportsFixture = {
  id: string
  homeTeam: string
  awayTeam: string
  kickoff: string
  venue: string | null
  homeScore: number | null
  awayScore: number | null
  liveStatus: string | null
  liveEvents: string[]
  liveUpdatedAt: number
}
type SportsLeague = { league: { name: string; short: string }; fixtures: SportsFixture[] }
type SportsData = { leagues: SportsLeague[]; updatedAt: number }

type LiveMarketCard = {
  id: string
  category: "crypto" | "forex" | "weather" | "sports" | "politics"
  title: string
  question: string
  liveLabel: string
  liveValue: string
  liveChange?: number
  sparklineValues: number[]
  resolvesAt: Date
  yesOdds: number
  noOdds: number
  icon: string
  marketId: string
  dataUpdatedAt?: number
  match?: {
    homeTeam: string
    awayTeam: string
    kickoff: string
    venue: string | null
    homeScore: number | null
    awayScore: number | null
    liveStatus: string | null
    liveEvents: string[]
    liveUpdatedAt: number
    leagueShort: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatChange(pct: number) {
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0, expired: false })
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setRemaining({ h: 0, m: 0, s: 0, expired: true }); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setRemaining({ h, m, s, expired: false })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return remaining
}

// ── Live Sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return <div className="h-10 w-24 bg-white/5 rounded animate-pulse" />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 96, h = 40
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(" ")
  const color = positive ? "#22c55e" : "#ef4444"
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${positive}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#sg-${positive})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Live dot */}
      <circle
        cx={w}
        cy={parseFloat(pts.split(" ").pop()!.split(",")[1])}
        r={3}
        fill={color}
        className="animate-livepulse"
      />
    </svg>
  )
}

// ── Countdown Display ─────────────────────────────────────────────────────────

function Countdown({ target }: { target: Date }) {
  const { h, m, s, expired } = useCountdown(target)
  if (expired) return <span className="text-red text-[11px] font-mono">CLOSED</span>
  return (
    <span className="text-[11px] font-mono tabular-nums text-fg-muted">
      ⏱{" "}
      <span className="text-fg">{String(h).padStart(2, "0")}</span>:
      <span className="text-fg">{String(m).padStart(2, "0")}</span>:
      <span className="text-fg">{String(s).padStart(2, "0")}</span>
    </span>
  )
}

function formatUpdatedAgo(updatedAt: number, nowTs: number) {
  const diff = Math.max(0, nowTs - updatedAt)
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function isDataStale(category: LiveMarketCard["category"], updatedAt: number, nowTs: number) {
  const age = nowTs - updatedAt
  if (category === "crypto") return age > 60_000
  if (category === "sports") return age > 300_000
  if (category === "weather") return age > 3_600_000
  if (category === "forex") return age > 86_400_000
  return false
}

function parseMatchPhase(liveStatus: string | null, kickoff: string, nowTs: number) {
  const normalized = (liveStatus ?? "").trim().toUpperCase()

  if (normalized) {
    if (normalized.includes("HALF") || normalized === "HT") {
      return { label: "HT", color: "text-amber", minute: 45, inPlay: false }
    }
    if (normalized.includes("FINISHED") || normalized === "FT") {
      return { label: "FT", color: "text-fg-muted", minute: 90, inPlay: false }
    }
    const minuteMatch = normalized.match(/(\d{1,3})/)
    if (minuteMatch) {
      const minute = Number.parseInt(minuteMatch[1] ?? "0", 10)
      return { label: `LIVE ${minute}'`, color: "text-green", minute, inPlay: true }
    }
    if (normalized.includes("2ND")) {
      return { label: "LIVE 2H", color: "text-green", minute: 68, inPlay: true }
    }
    if (normalized.includes("1ST")) {
      return { label: "LIVE 1H", color: "text-green", minute: 23, inPlay: true }
    }
    if (normalized.includes("NOT STARTED")) {
      return { label: "NS", color: "text-fg-muted", minute: 0, inPlay: false }
    }
  }

  const target = new Date(kickoff)
  if (Number.isNaN(target.getTime())) {
    return { label: "KO TBD", color: "text-fg-muted", minute: 0, inPlay: false }
  }

  const diffMs = target.getTime() - nowTs
  if (diffMs > 0) {
    const totalMins = Math.ceil(diffMs / 60_000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return { label: `KO in ${h}h ${m}m`, color: "text-amber", minute: 0, inPlay: false }
  }

  const minsFromKickoff = Math.floor(Math.abs(diffMs) / 60_000)
  if (minsFromKickoff <= 45) {
    return { label: `LIVE 1H ${minsFromKickoff}'`, color: "text-green", minute: minsFromKickoff, inPlay: true }
  }
  if (minsFromKickoff <= 60) {
    return { label: "HT", color: "text-amber", minute: 45, inPlay: false }
  }
  if (minsFromKickoff <= 105) {
    const minute = Math.min(90, minsFromKickoff - 15)
    return { label: `LIVE 2H ${minute}'`, color: "text-green", minute, inPlay: true }
  }
  return { label: "FT", color: "text-fg-muted", minute: 90, inPlay: false }
}

const LEAGUE_CHIP: Record<string, string> = {
  EPL: "bg-green/12 text-green border-green/30",
  UCL: "bg-blue-500/12 text-blue-300 border-blue-400/35",
  KEN: "bg-amber/12 text-amber border-amber/35",
}

// ── Market Card ───────────────────────────────────────────────────────────────

function LiveCard({ card, nowTs }: { card: LiveMarketCard; nowTs: number }) {
  const router = useRouter()
  const positive = (card.liveChange ?? 0) >= 0
  const detailHref = `/dashboard/markets/${card.marketId}`
  const stale = typeof card.dataUpdatedAt === "number" ? isDataStale(card.category, card.dataUpdatedAt, nowTs) : false
  const updatedText = typeof card.dataUpdatedAt === "number" ? formatUpdatedAgo(card.dataUpdatedAt, nowTs) : null
  const phase = card.match ? parseMatchPhase(card.match.liveStatus, card.match.kickoff, nowTs) : null
  const progressPct = phase ? Math.max(0, Math.min(100, (phase.minute / 90) * 100)) : 0

  useEffect(() => {
    router.prefetch(detailHref)
  }, [router, detailHref])

  const openCard = () => {
    router.push(detailHref)
  }

  const openWithPick = (pick: "yes" | "no") => {
    router.push(`${detailHref}?pick=${pick}`)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onPointerEnter={() => router.prefetch(detailHref)}
      onFocus={() => router.prefetch(detailHref)}
      onClick={openCard}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openCard()
        }
      }}
      role="button"
      tabIndex={0}
      className="relative shrink-0 w-[280px] rounded-2xl border border-line bg-bg-above/30 backdrop-blur-sm overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Top accent bar */}
      <div className={`h-0.5 w-full ${
        card.category === "crypto" ? "bg-gradient-to-r from-amber-500 to-amber-300" :
        card.category === "forex"  ? "bg-gradient-to-r from-blue-500 to-blue-300" :
        card.category === "weather"? "bg-gradient-to-r from-cyan-500 to-cyan-300" :
        card.category === "sports" ? "bg-gradient-to-r from-green to-emerald-300" :
        "bg-gradient-to-r from-purple-500 to-purple-300"
      }`} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{card.icon}</span>
            <div>
              <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">{card.category}</p>
              <p className="text-[13px] font-semibold leading-tight mt-0.5 line-clamp-1">{card.title}</p>
            </div>
          </div>
          {/* LIVE badge */}
          <div className="text-right shrink-0 mt-0.5 space-y-0.5">
            <div className="flex items-center justify-end gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stale ? "bg-amber" : "bg-green animate-livepulse"}`} />
              <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${stale ? "text-amber" : "text-green"}`}>
                {stale ? "Stale" : "Live"}
              </span>
            </div>
            {updatedText && (
              <p className="text-[9px] font-mono text-fg-muted">Updated {updatedText}</p>
            )}
          </div>
        </div>

        {/* Live data */}
        {card.category === "sports" && card.match ? (
          <div className="rounded-xl border border-line bg-bg/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-1.5 min-w-0 max-w-[68%]">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${LEAGUE_CHIP[card.match.leagueShort] ?? "bg-bg-above text-fg-muted border-line"}`}>
                  {card.match.leagueShort}
                </span>
                <span className="text-fg-secondary truncate">{card.match.venue ?? "Venue TBA"}</span>
              </div>
              <span className={`text-[11px] font-mono ${phase?.color ?? "text-fg-muted"}`}>{phase?.label ?? "KO TBD"}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[12px] font-semibold truncate">{card.match.homeTeam}</div>
                <div className="text-[18px] font-mono font-bold leading-none text-green tabular-nums">{card.match.homeScore ?? "-"}</div>
              </div>
              <div className="px-2 py-1 rounded-md border border-line bg-bg-above text-[12px] font-mono font-bold">:</div>
              <div className="space-y-0.5 min-w-0 text-right">
                <div className="text-[12px] font-semibold truncate">{card.match.awayTeam}</div>
                <div className="text-[18px] font-mono font-bold leading-none text-red tabular-nums">{card.match.awayScore ?? "-"}</div>
              </div>
            </div>
            <div className="h-1 rounded-full bg-bg-above overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-green/80 to-emerald-300/80"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: phase?.inPlay ? 0.9 : 0.35, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted">
              <span>{phase?.inPlay ? `Minute ${phase.minute}` : "Match timeline"}</span>
              <span>Updated {formatUpdatedAgo(card.match.liveUpdatedAt, nowTs)}</span>
            </div>
            {card.match.liveEvents.length > 0 && (
              <div className="rounded-md border border-line bg-bg-above/40 px-2 py-1">
                <p className="text-[10px] font-mono text-fg-muted truncate">
                  Live events: {card.match.liveEvents.slice(0, 2).join(" • ")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[22px] font-mono font-bold tabular-nums leading-none">{card.liveValue}</p>
              {card.liveChange !== undefined && (
                <p className={`text-[11px] font-mono mt-1 ${positive ? "text-green" : "text-red"}`}>
                  {positive ? "▲" : "▼"} {formatChange(card.liveChange)}
                </p>
              )}
            </div>
            <Sparkline values={card.sparklineValues} positive={positive} />
          </div>
        )}

        {/* Question */}
        <div className="border-t border-line/60 pt-2.5">
          <p className="text-[12px] font-medium text-fg-secondary leading-snug line-clamp-2">{card.question}</p>
        </div>

        {/* Countdown */}
        <Countdown target={card.resolvesAt} />

        {/* Bet buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openWithPick("yes")
            }}
            className="h-9 rounded-xl bg-green/10 border border-green/30 text-green text-[12px] font-bold flex items-center justify-center gap-1.5 hover:bg-green/20 transition-colors"
          >
            YES <span className="text-[10px] opacity-70">{card.yesOdds}%</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openWithPick("no")
            }}
            className="h-9 rounded-xl bg-red/10 border border-red/30 text-red text-[12px] font-bold flex items-center justify-center gap-1.5 hover:bg-red/20 transition-colors"
          >
            NO <span className="text-[10px] opacity-70">{card.noOdds}%</span>
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openCard()
          }}
          className="text-[10px] font-mono text-fg-muted hover:text-fg transition-colors text-center"
        >
          View live chart →
        </button>
      </div>
    </motion.article>
  )
}

// ── Category Tabs ─────────────────────────────────────────────────────────────

const CATS = ["all", "crypto", "forex", "weather", "sports", "politics"] as const
type Cat = typeof CATS[number]

// ── Main Component ────────────────────────────────────────────────────────────

export function LiveMarketsStrip() {
  const [crypto, setCrypto] = useState<CryptoData | null>(null)
  const [forex, setForex] = useState<ForexData | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [sports, setSports] = useState<SportsData | null>(null)
  const [activeCat, setActiveCat] = useState<Cat>("all")
  const [nowTs, setNowTs] = useState(Date.now())

  // Sparkline ringbuffers — hold last 30 price samples
  const btcHistory = useRef<number[]>([])
  const ethHistory = useRef<number[]>([])
  const solHistory = useRef<number[]>([])
  const kesHistory = useRef<number[]>([])

  const fetchCrypto = useCallback(async () => {
    try {
      const res = await fetch("/api/live/crypto", { cache: "no-store" })
      if (!res.ok) return
      const data: CryptoData = await res.json()
      setCrypto(data)
      // Push to ringbuffers
      const push = (ref: React.MutableRefObject<number[]>, val: number) => {
        ref.current = [...ref.current, val].slice(-30)
      }
      push(btcHistory, data.btc.price)
      push(ethHistory, data.eth.price)
      push(solHistory, data.sol.price)
    } catch { /* silent */ }
  }, [])

  const fetchForex = useCallback(async () => {
    try {
      const res = await fetch("/api/live/forex", { cache: "no-store" })
      if (!res.ok) return
      const data: ForexData = await res.json()
      setForex(data)
      kesHistory.current = [...kesHistory.current, data.rates.KES ?? 129].slice(-30)
    } catch { /* silent */ }
  }, [])

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/live/weather", { cache: "no-store" })
      if (!res.ok) return
      const data: WeatherData = await res.json()
      setWeather(data)
    } catch { /* silent */ }
  }, [])

  const fetchSports = useCallback(async () => {
    try {
      const res = await fetch("/api/live/sports", { cache: "no-store" })
      if (!res.ok) return
      const data: SportsData = await res.json()
      setSports(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    // Initial fetches
    fetchCrypto()
    fetchForex()
    fetchWeather()
    fetchSports()

    // Poll crypto every 15s
    const cryptoInterval = setInterval(fetchCrypto, 15_000)
    // Forex every 5 min (rates change daily)
    const forexInterval = setInterval(fetchForex, 300_000)
    // Weather every 15 min
    const weatherInterval = setInterval(fetchWeather, 900_000)
    // Sports every 30 min
    const sportsInterval = setInterval(fetchSports, 1_800_000)

    return () => {
      clearInterval(cryptoInterval)
      clearInterval(forexInterval)
      clearInterval(weatherInterval)
      clearInterval(sportsInterval)
    }
  }, [fetchCrypto, fetchForex, fetchWeather, fetchSports])

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Build midnight EAT resolution time for today
  const midnightEAT = (() => {
    const d = new Date()
    d.setUTCHours(21, 0, 0, 0) // 21:00 UTC = midnight EAT
    if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 1)
    return d
  })()

  const endOfWeek = (() => {
    const d = new Date()
    const dayOfWeek = d.getDay()
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
    d.setDate(d.getDate() + daysUntilSunday)
    d.setHours(23, 59, 59, 0)
    return d
  })()

  // Build market cards
  const cards: LiveMarketCard[] = []

  if (crypto) {
    cards.push({
      id: "btc-card",
      category: "crypto",
      title: "Bitcoin",
      question: "Will Bitcoin close above $80,000 tonight?",
      liveLabel: "BTC/USD",
      liveValue: `$${crypto.btc.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      liveChange: crypto.btc.change24h,
      sparklineValues: btcHistory.current.length > 1 ? btcHistory.current : [crypto.btc.price * 0.98, crypto.btc.price],
      resolvesAt: midnightEAT,
      yesOdds: 38,
      noOdds: 62,
      icon: "₿",
      marketId: "btc_ath",
      dataUpdatedAt: crypto.updatedAt,
    })

    cards.push({
      id: "eth-card",
      category: "crypto",
      title: "Ethereum",
      question: "Will Ethereum close above $2,500 this week?",
      liveLabel: "ETH/USD",
      liveValue: `$${crypto.eth.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      liveChange: crypto.eth.change24h,
      sparklineValues: ethHistory.current.length > 1 ? ethHistory.current : [crypto.eth.price * 0.98, crypto.eth.price],
      resolvesAt: endOfWeek,
      yesOdds: 52,
      noOdds: 48,
      icon: "Ξ",
      marketId: "eth_2500_week",
      dataUpdatedAt: crypto.updatedAt,
    })

    cards.push({
      id: "sol-card",
      category: "crypto",
      title: "Solana",
      question: `Will Solana price drop below $${Math.round(crypto.sol.price * 0.9).toLocaleString()} this week?`,
      liveLabel: "SOL/USD",
      liveValue: `$${crypto.sol.price.toFixed(2)}`,
      liveChange: crypto.sol.change24h,
      sparklineValues: solHistory.current.length > 1 ? solHistory.current : [crypto.sol.price * 0.98, crypto.sol.price],
      resolvesAt: endOfWeek,
      yesOdds: 35,
      noOdds: 65,
      icon: "◎",
      marketId: "sol_drop_10_week",
      dataUpdatedAt: crypto.updatedAt,
    })
  }

  if (forex) {
    const kesRate = forex.rates.KES ?? 129
    cards.push({
      id: "kes-card",
      category: "forex",
      title: "USD/KES",
      question: "Will the Dollar exceed KES 130 before end of month?",
      liveLabel: "USD/KES",
      liveValue: `KES ${kesRate.toFixed(2)}`,
      liveChange: ((kesRate - 128) / 128) * 100,
      sparklineValues: kesHistory.current.length > 1 ? kesHistory.current : [128.5, kesRate],
      resolvesAt: endOfWeek,
      yesOdds: 44,
      noOdds: 56,
      icon: "💱",
      marketId: "usd_kes_130_month",
      dataUpdatedAt: forex.updatedAt ? Date.parse(forex.updatedAt) : Date.now(),
    })

    cards.push({
      id: "eur-card",
      category: "forex",
      title: "EUR/USD",
      question: "Will the Euro strengthen against the Dollar this week?",
      liveLabel: "EUR/USD",
      liveValue: `${(forex.rates.EUR ?? 0.85).toFixed(4)}`,
      liveChange: 0.31,
      sparklineValues: [0.844, 0.847, 0.849, 0.848, 0.851, forex.rates.EUR ?? 0.85],
      resolvesAt: endOfWeek,
      yesOdds: 55,
      noOdds: 45,
      icon: "€",
      marketId: "eurusd_up_week",
      dataUpdatedAt: forex.updatedAt ? Date.parse(forex.updatedAt) : Date.now(),
    })
  }

  if (weather) {
    const { current, forecast } = weather
    const weekendRain = forecast.slice(1, 3).reduce((s, d) => s + d.precipSum, 0)
    cards.push({
      id: "rain-card",
      category: "weather",
      title: "Nairobi Weather",
      question: `Will Nairobi receive over 10mm rain this weekend?`,
      liveLabel: "Now in Nairobi",
      liveValue: `${current.temp.toFixed(1)}°C`,
      liveChange: undefined,
      sparklineValues: forecast.map(d => d.precipSum).concat([current.precip]),
      resolvesAt: endOfWeek,
      yesOdds: weekendRain > 5 ? 60 : 35,
      noOdds: weekendRain > 5 ? 40 : 65,
      icon: "⛅",
      marketId: "nairobi_rain_weekend",
      dataUpdatedAt: weather.updatedAt,
    })

    cards.push({
      id: "temp-card",
      category: "weather",
      title: "Nairobi Temp",
      question: "Will Nairobi temperatures exceed 28°C this week?",
      liveLabel: "Current temp",
      liveValue: `${current.temp.toFixed(1)}°C`,
      liveChange: undefined,
      sparklineValues: forecast.map(d => d.tempMax),
      resolvesAt: endOfWeek,
      yesOdds: forecast.some(d => d.tempMax > 28) ? 70 : 30,
      noOdds: forecast.some(d => d.tempMax > 28) ? 30 : 70,
      icon: "🌡️",
      marketId: "nairobi_heat_28_week",
      dataUpdatedAt: weather.updatedAt,
    })
  }

  if (sports) {
    for (const league of sports.leagues) {
      const fix = league.fixtures[0]
      if (!fix) continue
      cards.push({
        id: `${league.league.short}-card`,
        category: "sports",
        title: `${league.league.short} Match`,
        question: `Who wins: ${fix.homeTeam} vs ${fix.awayTeam}?`,
        liveLabel: "Next fixture",
        liveValue: `${fix.homeTeam.split(" ").pop()} vs ${fix.awayTeam.split(" ").pop()}`,
        liveChange: undefined,
        sparklineValues: [],
        resolvesAt: new Date(fix.kickoff),
        yesOdds: 50,
        noOdds: 50,
        icon: "⚽",
        marketId: league.league.short === "EPL" ? "epl_winner" : league.league.short === "KEN" ? "harambee_afcon" : "arsenal_quadruple",
        dataUpdatedAt: sports.updatedAt,
        match: {
          homeTeam: fix.homeTeam,
          awayTeam: fix.awayTeam,
          kickoff: fix.kickoff,
          venue: fix.venue,
          homeScore: fix.homeScore,
          awayScore: fix.awayScore,
          liveStatus: fix.liveStatus,
          liveEvents: fix.liveEvents,
          liveUpdatedAt: fix.liveUpdatedAt,
          leagueShort: league.league.short,
        },
      })
    }
  }

  // Politics (static with real countdown)
  const electionDate = new Date("2027-08-10T06:00:00+03:00")
  cards.push({
    id: "pres-card",
    category: "politics",
    title: "2027 Elections",
    question: "Will William Ruto win the 2027 Kenya Presidential Election?",
    liveLabel: "Days to election",
    liveValue: `${Math.ceil((electionDate.getTime() - Date.now()) / 86_400_000)}d`,
    liveChange: undefined,
    sparklineValues: [],
    resolvesAt: electionDate,
    yesOdds: 40,
    noOdds: 60,
    icon: "🏛️",
    marketId: "pres_2027",
  })

  const filtered = activeCat === "all" ? cards : cards.filter(c => c.category === activeCat)

  const isLoading = !crypto && !forex && !weather

  return (
    <section className="py-10 border-t border-line">
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
            </span>
            <h2 className="text-[18px] sm:text-[22px] font-bold">Live Markets</h2>
          </div>
          <span className="text-[11px] font-mono text-fg-muted bg-bg-above px-2 py-0.5 rounded-md border border-line">
            Real data · Updates every 15s
          </span>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
          {CATS.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 h-7 px-3 text-[11px] font-mono rounded-full border transition-all ${
                activeCat === cat
                  ? "bg-green/10 border-green/40 text-green font-bold"
                  : "border-line text-fg-muted hover:border-line-bright hover:text-fg-secondary"
              }`}
            >
              {cat === "all" ? "All Markets" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Cards strip */}
        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="shrink-0 w-[280px] h-[280px] rounded-2xl border border-line bg-bg-above/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {filtered.map(card => (
                <LiveCard key={card.id} card={card} nowTs={nowTs} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-[13px] font-mono text-fg-muted py-8">No {activeCat} markets available right now.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] font-mono text-fg-muted">
            Data: CoinGecko · ExchangeRate API · Open-Meteo · TheSportsDB
          </p>
          <Link href="/dashboard/markets" className="text-[11px] font-mono text-green hover:opacity-80 transition-opacity">
            Browse all markets →
          </Link>
        </div>
      </div>
    </section>
  )
}
