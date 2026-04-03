"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";

/* ── Mock markets DB (will be replaced with real queries) ── */
const marketsDB: Record<string, Market> = {
  "1": {
    id: 1,
    q: "Arsenal wins the Premier League 2025",
    desc: "Will Arsenal FC win the English Premier League for the 2024/25 season? Resolves YES if Arsenal finishes first in the final league table.",
    category: "Sports",
    odds: 62,
    players: 148,
    volume: "1.2M",
    endDate: "2025-06-01",
    trend: [30, 35, 42, 48, 55, 48, 52, 58, 60, 58, 62, 64, 60, 62],
    hot: true,
    status: "LIVE",
    creator: "James K.",
    createdAt: "2025-01-15",
    minStake: 100,
    maxStake: 50000,
    participants: [
      { name: "James K.", side: "YES", amount: 5000, avatar: "JK" },
      { name: "Sarah M.", side: "YES", amount: 2000, avatar: "SM" },
      { name: "Brian O.", side: "NO", amount: 3000, avatar: "BO" },
      { name: "Grace W.", side: "YES", amount: 1500, avatar: "GW" },
      { name: "Peter N.", side: "NO", amount: 4000, avatar: "PN" },
      { name: "Alice T.", side: "YES", amount: 800, avatar: "AT" },
    ],
    activity: [
      { user: "Grace W.", action: "bought YES", amount: "1,500 KES", time: "2h ago" },
      { user: "Peter N.", action: "bought NO", amount: "4,000 KES", time: "5h ago" },
      { user: "Alice T.", action: "bought YES", amount: "800 KES", time: "1d ago" },
      { user: "Brian O.", action: "bought NO", amount: "3,000 KES", time: "2d ago" },
      { user: "Sarah M.", action: "bought YES", amount: "2,000 KES", time: "3d ago" },
    ],
    rules: [
      "Resolves based on official Premier League standings",
      "If season is cancelled, resolves NO",
      "Settlement within 24 hours of final matchday",
    ],
    relatedIds: ["7", "4"],
    news: [
      { title: "Arsenal extend lead after North London derby win", source: "BBC Sport", time: "3h" },
      { title: "Saka returns from injury, passes fitness test", source: "Sky Sports", time: "1d" },
    ],
  },
  "2": {
    id: 2,
    q: "BTC above $100k by end of 2025",
    desc: "Will the price of Bitcoin (BTC/USD) be above $100,000 at any point before December 31, 2025 23:59 UTC?",
    category: "Finance",
    odds: 38,
    players: 312,
    volume: "4.8M",
    endDate: "2025-12-31",
    trend: [65, 62, 55, 50, 42, 48, 44, 35, 38, 40, 38, 36, 38, 38],
    hot: true,
    status: "LIVE",
    creator: "Alex R.",
    createdAt: "2025-01-01",
    minStake: 50,
    maxStake: 100000,
    participants: [
      { name: "Alex R.", side: "YES", amount: 10000, avatar: "AR" },
      { name: "Mike L.", side: "NO", amount: 8000, avatar: "ML" },
      { name: "Jane D.", side: "YES", amount: 5000, avatar: "JD" },
      { name: "Tom K.", side: "NO", amount: 12000, avatar: "TK" },
    ],
    activity: [
      { user: "Tom K.", action: "bought NO", amount: "12,000 KES", time: "1h ago" },
      { user: "Jane D.", action: "bought YES", amount: "5,000 KES", time: "6h ago" },
      { user: "Mike L.", action: "bought NO", amount: "8,000 KES", time: "1d ago" },
    ],
    rules: [
      "Price source: CoinGecko BTC/USD",
      "Must reach $100,000.00 at any point",
      "Resolves YES immediately upon hitting target",
    ],
    relatedIds: ["5"],
    news: [
      { title: "Bitcoin dips below $70k amid broader market selloff", source: "CoinDesk", time: "5h" },
      { title: "Fed signals potential rate cut in Q3", source: "Reuters", time: "2d" },
    ],
  },
  "7": {
    id: 7,
    q: "Man City vs Real Madrid UCL winner",
    desc: "Who will win the UEFA Champions League match between Manchester City and Real Madrid? Resolves based on the aggregate result over two legs.",
    category: "Sports",
    odds: 56,
    players: 234,
    volume: "890K",
    endDate: "2025-05-15",
    trend: [48, 52, 45, 55, 50, 52, 58, 56, 54, 56, 55, 56, 57, 56],
    hot: true,
    status: "LIVE",
    creator: "David M.",
    createdAt: "2025-02-10",
    minStake: 100,
    maxStake: 25000,
    participants: [
      { name: "David M.", side: "YES", amount: 3000, avatar: "DM" },
      { name: "Chris P.", side: "NO", amount: 2500, avatar: "CP" },
      { name: "Ken W.", side: "YES", amount: 4000, avatar: "KW" },
    ],
    activity: [
      { user: "Ken W.", action: "bought YES", amount: "4,000 KES", time: "4h ago" },
      { user: "Chris P.", action: "bought NO", amount: "2,500 KES", time: "1d ago" },
    ],
    rules: [
      "Based on aggregate score over two legs",
      "Extra time and penalties count",
      "Resolves within 2 hours of final whistle",
    ],
    relatedIds: ["1"],
    news: [
      { title: "Haaland ruled fit for Champions League tie", source: "ESPN", time: "6h" },
    ],
  },
};

/* fallback for IDs we don't have detail for */
const fallbackMarket = (id: string): Market => ({
  id: Number(id),
  q: `Market #${id}`,
  desc: "Market details loading...",
  category: "General",
  odds: 50,
  players: 0,
  volume: "0",
  endDate: "2025-12-31",
  trend: [50, 50, 50, 50, 50, 50, 50],
  hot: false,
  status: "LIVE",
  creator: "System",
  createdAt: "2025-01-01",
  minStake: 100,
  maxStake: 10000,
  participants: [],
  activity: [],
  rules: ["Standard resolution rules apply"],
  relatedIds: [],
  news: [],
});

interface Market {
  id: number;
  q: string;
  desc: string;
  category: string;
  odds: number;
  players: number;
  volume: string;
  endDate: string;
  trend: number[];
  hot: boolean;
  status: string;
  creator: string;
  createdAt: string;
  minStake: number;
  maxStake: number;
  participants: { name: string; side: string; amount: number; avatar: string }[];
  activity: { user: string; action: string; amount: string; time: string }[];
  rules: string[];
  relatedIds: string[];
  news: { title: string; source: string; time: string }[];
}

/* ── Chart component (inline mini line chart) ── */
function OddsChart({ data, color }: { data: number[]; color: string }) {
  const width = 400;
  const height = 120;
  const padding = 8;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* current price dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].split(",")[0]}
          cy={points[points.length - 1].split(",")[1]}
          r="4"
          fill={color}
          stroke="var(--c-bg)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

/* ── Countdown helper ── */
function useCountdown(endDate: string) {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const tabs = ["Chart", "Activity", "Rules", "News"] as const;
type Tab = (typeof tabs)[number];

export default function MarketDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const market = marketsDB[id as string] ?? fallbackMarket(id as string);
  const countdown = useCountdown(market.endDate);

  const [activeTab, setActiveTab] = useState<Tab>("Chart");
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [placing, setPlacing] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const payout = useMemo(() => {
    if (!amount) return "0";
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return "0";
    const odds = side === "YES" ? market.odds / 100 : (100 - market.odds) / 100;
    return (amt / odds).toFixed(0);
  }, [amount, side, market.odds]);

  const multiplier = side === "YES"
    ? (100 / market.odds).toFixed(2)
    : (100 / (100 - market.odds)).toFixed(2);

  const yesPool = market.participants.filter((p) => p.side === "YES").reduce((a, b) => a + b.amount, 0);
  const noPool = market.participants.filter((p) => p.side === "NO").reduce((a, b) => a + b.amount, 0);

  const placeBet = () => {
    if (!amount || Number(amount) < market.minStake) {
      toast("error", "Invalid amount", `Minimum stake is ${market.minStake.toLocaleString()} KES`);
      return;
    }
    setPlacing(true);
    setTimeout(() => {
      setPlacing(false);
      toast("success", "Bet placed!", `${side} on "${market.q}" for ${Number(amount).toLocaleString()} KES`);
      setAmount("");
    }, 1200);
  };

  const shareUrl = `https://stakepesa.com/m/${market.id}`;

  return (
    <div className="max-w-6xl space-y-5">
      {/* ── Back + Breadcrumb ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-[12px] font-mono text-fg-muted"
      >
        <Link href="/dashboard/markets" className="hover:text-green transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Markets
        </Link>
        <span>/</span>
        <span className="text-fg-secondary truncate">{market.q}</span>
      </motion.div>

      {/* ── Market header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="border border-line rounded-lg p-5"
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-fg-muted bg-bg-above px-2 py-0.5 rounded">{market.category}</span>
          {market.hot && (
            <span className="text-[10px] font-mono text-amber font-bold bg-amber/10 px-2 py-0.5 rounded animate-pulse">
              🔥 HOT
            </span>
          )}
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            market.status === "LIVE" ? "bg-green/10 text-green" : "bg-amber/10 text-amber"
          }`}>
            {market.status === "LIVE" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green mr-1 animate-pulse" />}
            {market.status}
          </span>
          <span className="text-[11px] font-mono text-fg-muted ml-auto flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {countdown} left
          </span>
        </div>

        <h1 className="text-[22px] sm:text-[26px] font-bold leading-tight mb-2">{market.q}</h1>
        <p className="text-[14px] text-fg-secondary leading-relaxed mb-4">{market.desc}</p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-[12px] font-mono text-fg-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {market.players} players
          </span>
          <span>Vol: {market.volume} KES</span>
          <span>Created by <span className="text-fg-secondary font-medium">{market.creator}</span></span>
          <span>Created {market.createdAt}</span>
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="ml-auto text-green hover:underline flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share
          </button>
        </div>

        {/* Share menu */}
        <AnimatePresence>
          {showShareMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-line flex items-center gap-2 overflow-hidden"
            >
              {[
                { label: "Copy Link", icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.5a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.131" },
                { label: "WhatsApp", icon: "" },
                { label: "X", icon: "" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    toast("success", "Copied!", shareUrl);
                    setShowShareMenu(false);
                  }}
                  className="h-7 px-3 text-[11px] font-mono border border-line rounded-md hover:bg-bg-above transition-all"
                >
                  {s.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Main content: Chart/Info + Bet Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Left — Tabs content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Odds overview bar */}
          <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden mb-5">
            <div className="bg-bg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">Yes</span>
                <span className="text-[11px] font-mono text-green font-bold bg-green/10 px-1.5 py-0.5 rounded">
                  {multiplier === (100 / market.odds).toFixed(2) ? `${(100 / market.odds).toFixed(2)}x` : `${(100 / market.odds).toFixed(2)}x`}
                </span>
              </div>
              <span className="text-[32px] font-mono font-bold text-green leading-none">{market.odds}%</span>
              <div className="text-[11px] font-mono text-fg-muted mt-1">Pool: {yesPool.toLocaleString()} KES</div>
            </div>
            <div className="bg-bg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">No</span>
                <span className="text-[11px] font-mono text-red font-bold bg-red/10 px-1.5 py-0.5 rounded">
                  {(100 / (100 - market.odds)).toFixed(2)}x
                </span>
              </div>
              <span className="text-[32px] font-mono font-bold text-red leading-none">{100 - market.odds}%</span>
              <div className="text-[11px] font-mono text-fg-muted mt-1">Pool: {noPool.toLocaleString()} KES</div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-line mb-4">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`relative h-9 px-3 text-[13px] font-mono transition-all ${
                  activeTab === t ? "text-green font-semibold" : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {activeTab === t && (
                  <motion.div
                    layoutId="market-tab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-green rounded-t"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {t}
                {t === "Activity" && <span className="ml-1 text-[10px] text-fg-muted">{market.activity.length}</span>}
                {t === "News" && market.news.length > 0 && <span className="ml-1 text-[10px] text-fg-muted">{market.news.length}</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === "Chart" && (
              <motion.div
                key="chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-line rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">Odds Over Time</span>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-fg-muted">
                    <button className="px-2 py-0.5 rounded hover:bg-bg-above transition-all text-green font-semibold">ALL</button>
                    <button className="px-2 py-0.5 rounded hover:bg-bg-above transition-all">7D</button>
                    <button className="px-2 py-0.5 rounded hover:bg-bg-above transition-all">24H</button>
                  </div>
                </div>
                <div className="h-[200px]">
                  <OddsChart data={market.trend} color={market.odds >= 50 ? "#22c55e" : "#ef4444"} />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-fg-muted mt-2">
                  <span>{market.createdAt}</span>
                  <span>Now</span>
                </div>
              </motion.div>
            )}

            {activeTab === "Activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-line rounded-lg overflow-hidden"
              >
                {market.activity.length === 0 ? (
                  <div className="py-12 text-center text-[14px] text-fg-muted">No activity yet</div>
                ) : (
                  market.activity.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-bg-above/40 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-bg-above border border-line flex items-center justify-center text-[10px] font-mono font-bold text-fg-muted shrink-0">
                        {a.user.split(" ").map((w) => w[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px]">
                          <span className="font-medium">{a.user}</span>
                          <span className="text-fg-muted"> {a.action} </span>
                          <span className={`font-mono font-semibold ${a.action.includes("YES") ? "text-green" : "text-red"}`}>
                            {a.amount}
                          </span>
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-fg-muted shrink-0">{a.time}</span>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "Rules" && (
              <motion.div
                key="rules"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-line rounded-lg p-4 space-y-3"
              >
                <h3 className="text-[13px] font-mono text-fg-muted uppercase tracking-wider">Resolution Criteria</h3>
                <ul className="space-y-2">
                  {market.rules.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[14px] text-fg-secondary">
                      <svg className="w-4 h-4 text-green mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                      </svg>
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-line space-y-2 text-[12px] font-mono text-fg-muted">
                  <div className="flex justify-between">
                    <span>Min Stake</span>
                    <span className="text-fg-secondary">{market.minStake.toLocaleString()} KES</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Stake</span>
                    <span className="text-fg-secondary">{market.maxStake.toLocaleString()} KES</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="text-fg-secondary">{market.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ends</span>
                    <span className="text-fg-secondary">{market.endDate}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "News" && (
              <motion.div
                key="news"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border border-line rounded-lg overflow-hidden"
              >
                {market.news.length === 0 ? (
                  <div className="py-12 text-center text-[14px] text-fg-muted">No related news</div>
                ) : (
                  market.news.map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-bg-above/40 transition-colors">
                      <div className="w-8 h-8 rounded bg-bg-above border border-line flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25H5.625a2.25 2.25 0 01-2.25-2.25V7.875c0-.621.504-1.125 1.125-1.125H7.5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium leading-snug">{n.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-fg-muted">
                          <span>{n.source}</span>
                          <span>·</span>
                          <span>{n.time} ago</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Participants ── */}
          <div className="mt-5">
            <h3 className="text-[13px] font-mono text-fg-muted uppercase tracking-wider mb-3">
              Participants
              <span className="ml-1.5 text-fg-secondary">{market.participants.length}</span>
            </h3>
            <div className="border border-line rounded-lg overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_60px_100px] h-8 items-center px-4 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
                <span>Player</span>
                <span className="text-center">Side</span>
                <span className="text-right">Stake</span>
              </div>
              {market.participants.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="grid grid-cols-[1fr_60px_100px] items-center px-4 py-2.5 border-b border-line last:border-b-0 hover:bg-bg-above/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-bg-above border border-line flex items-center justify-center text-[10px] font-mono font-bold text-fg-muted">
                      {p.avatar}
                    </div>
                    <span className="text-[13px] font-medium">{p.name}</span>
                  </div>
                  <span className={`text-center text-[11px] font-mono font-bold ${p.side === "YES" ? "text-green" : "text-red"}`}>
                    {p.side}
                  </span>
                  <span className="text-right text-[13px] font-mono text-fg-secondary">
                    {p.amount.toLocaleString()} <span className="text-fg-muted text-[11px]">KES</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right — Bet panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          {/* Bet card */}
          <div className="border border-line rounded-lg overflow-hidden sticky top-[72px]">
            <div className="p-4 border-b border-line bg-bg-above/30">
              <span className="text-[13px] font-mono font-semibold uppercase tracking-wider">Place Your Bet</span>
            </div>

            <div className="p-4 space-y-4">
              {/* YES/NO toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSide("YES")}
                  className={`h-12 rounded-md text-[15px] font-bold font-mono transition-all ${
                    side === "YES"
                      ? "bg-green text-white shadow-lg shadow-green/20"
                      : "border border-line text-fg-muted hover:border-green/30 hover:text-green"
                  }`}
                >
                  YES {market.odds}%
                  <span className="block text-[11px] font-normal opacity-80">{(100 / market.odds).toFixed(2)}x payout</span>
                </button>
                <button
                  onClick={() => setSide("NO")}
                  className={`h-12 rounded-md text-[15px] font-bold font-mono transition-all ${
                    side === "NO"
                      ? "bg-red text-white shadow-lg shadow-red/20"
                      : "border border-line text-fg-muted hover:border-red/30 hover:text-red"
                  }`}
                >
                  NO {100 - market.odds}%
                  <span className="block text-[11px] font-normal opacity-80">{(100 / (100 - market.odds)).toFixed(2)}x payout</span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                  Stake Amount (KES)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 px-3 text-[16px] font-mono bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all tabular-nums"
                  placeholder={market.minStake.toString()}
                  min={market.minStake}
                  max={market.maxStake}
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-1.5 flex-wrap">
                {["500", "1000", "2500", "5000"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`h-7 px-2.5 text-[11px] font-mono border rounded-md transition-all ${
                      amount === v
                        ? "border-green text-green bg-green/8 font-semibold"
                        : "border-line text-fg-muted hover:text-fg-secondary hover:border-line-bright"
                    }`}
                  >
                    {Number(v).toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-bg-above/40 rounded-md p-3 space-y-2 text-[12px] font-mono">
                <div className="flex justify-between">
                  <span className="text-fg-muted">Your pick</span>
                  <span className={`font-bold ${side === "YES" ? "text-green" : "text-red"}`}>{side}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Odds</span>
                  <span className="text-fg-secondary">{side === "YES" ? market.odds : 100 - market.odds}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Multiplier</span>
                  <span className="text-fg-secondary font-semibold">{multiplier}x</span>
                </div>
                {amount && Number(amount) > 0 && (
                  <>
                    <div className="pt-2 border-t border-line flex justify-between">
                      <span className="text-fg-muted">Stake</span>
                      <span className="text-fg-secondary">{Number(amount).toLocaleString()} KES</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Potential payout</span>
                      <span className="text-green font-bold">{Number(payout).toLocaleString()} KES</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-muted">Potential profit</span>
                      <span className="text-green font-bold">
                        +{(Number(payout) - Number(amount)).toLocaleString()} KES
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Place bet button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={placeBet}
                disabled={placing}
                className={`w-full h-11 rounded-md text-[14px] font-bold font-mono transition-all ${
                  side === "YES"
                    ? "bg-green text-white hover:shadow-lg hover:shadow-green/20"
                    : "bg-red text-white hover:shadow-lg hover:shadow-red/20"
                } disabled:opacity-50`}
              >
                {placing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Placing...
                  </span>
                ) : (
                  `Buy ${side} — ${amount ? Number(amount).toLocaleString() : 0} KES`
                )}
              </motion.button>

              <p className="text-[10px] font-mono text-fg-muted text-center">
                Min {market.minStake.toLocaleString()} KES · Max {market.maxStake.toLocaleString()} KES
              </p>
            </div>
          </div>

          {/* Related markets */}
          {market.relatedIds.length > 0 && (
            <div className="border border-line rounded-lg p-4">
              <h3 className="text-[12px] font-mono text-fg-muted uppercase tracking-wider mb-3">Related Markets</h3>
              <div className="space-y-2">
                {market.relatedIds.map((rid) => {
                  const rm = marketsDB[rid];
                  if (!rm) return null;
                  return (
                    <Link
                      key={rid}
                      href={`/dashboard/markets/${rid}`}
                      className="flex items-center justify-between px-3 py-2 rounded-md border border-line hover:bg-bg-above/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium truncate">{rm.q}</p>
                        <span className="text-[11px] font-mono text-fg-muted">{rm.players} players</span>
                      </div>
                      <span className={`text-[14px] font-mono font-bold shrink-0 ml-2 ${rm.odds >= 50 ? "text-green" : "text-red"}`}>
                        {rm.odds}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
