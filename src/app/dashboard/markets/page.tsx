"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkline } from "@/components/ui/sparkline";
import { useToast } from "@/components/ui/toast";

/* ── Categories ── */
const categories = ["All", "Sports", "Finance", "Personal", "Politics", "Entertainment"] as const;
type Category = (typeof categories)[number];

/* ── Mock markets ── */
const markets = [
  {
    id: 1,
    q: "Arsenal wins the Premier League 2025",
    category: "Sports",
    odds: 62,
    players: 148,
    volume: "1.2M",
    endDate: "Jun 1",
    trend: [30, 42, 55, 48, 60, 58, 62],
    hot: true,
    status: "LIVE" as const,
  },
  {
    id: 2,
    q: "BTC above $100k by end of 2025",
    category: "Finance",
    odds: 38,
    players: 312,
    volume: "4.8M",
    endDate: "Dec 31",
    trend: [65, 55, 42, 48, 35, 40, 38],
    hot: true,
    status: "LIVE" as const,
  },
  {
    id: 3,
    q: "No junk food for 30 days challenge",
    category: "Personal",
    odds: 71,
    players: 8,
    volume: "24K",
    endDate: "Apr 15",
    trend: [50, 55, 58, 62, 65, 68, 71],
    hot: false,
    status: "LIVE" as const,
  },
  {
    id: 4,
    q: "Ruto signs Finance Bill 2025",
    category: "Politics",
    odds: 44,
    players: 567,
    volume: "2.1M",
    endDate: "Sep 30",
    trend: [60, 52, 48, 55, 42, 46, 44],
    hot: true,
    status: "LIVE" as const,
  },
  {
    id: 5,
    q: "KES/USD reaches 125 by Q3",
    category: "Finance",
    odds: 23,
    players: 89,
    volume: "680K",
    endDate: "Sep 30",
    trend: [35, 30, 28, 25, 22, 24, 23],
    hot: false,
    status: "LIVE" as const,
  },
  {
    id: 6,
    q: "Complete 100 pushups daily for a week",
    category: "Personal",
    odds: 82,
    players: 5,
    volume: "15K",
    endDate: "Mar 25",
    trend: [60, 65, 70, 75, 78, 80, 82],
    hot: false,
    status: "VOTING" as const,
  },
  {
    id: 7,
    q: "Man City vs Real Madrid UCL winner",
    category: "Sports",
    odds: 56,
    players: 234,
    volume: "890K",
    endDate: "May 15",
    trend: [48, 52, 45, 55, 50, 58, 56],
    hot: true,
    status: "LIVE" as const,
  },
  {
    id: 8,
    q: "Drake drops new album before July",
    category: "Entertainment",
    odds: 67,
    players: 178,
    volume: "320K",
    endDate: "Jun 30",
    trend: [40, 45, 50, 55, 60, 64, 67],
    hot: false,
    status: "LIVE" as const,
  },
];

export default function MarketsPage() {
  const [cat, setCat] = useState<Category>("All");
  const [sort, setSort] = useState<"volume" | "players" | "odds">("volume");
  const { toast } = useToast();
  const [joined, setJoined] = useState<Set<number>>(new Set());

  const filtered = markets
    .filter((m) => cat === "All" || m.category === cat)
    .sort((a, b) => {
      if (sort === "volume") return parseFloat(b.volume) - parseFloat(a.volume);
      if (sort === "players") return b.players - a.players;
      return b.odds - a.odds;
    });

  const joinMarket = (m: typeof markets[0]) => {
    if (joined.has(m.id)) {
      toast("info", "Already joined", `You're already in "${m.q}"`);
      return;
    }
    setJoined((prev) => new Set(prev).add(m.id));
    toast("success", "Joined market!", `You staked on "${m.q}"`);
  };

  return (
    <div className="max-w-6xl space-y-5">
      {/* ── Top bar: categories + sort ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`relative h-8 px-3 text-[13px] font-mono whitespace-nowrap rounded-md transition-all ${
                cat === c
                  ? "text-green font-semibold"
                  : "text-fg-muted hover:text-fg-secondary hover:bg-bg-above"
              }`}
            >
              {cat === c && (
                <motion.div
                  layoutId="market-cat"
                  className="absolute inset-0 bg-green/8 rounded-md border border-green/15"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>

        {/* Sort + Create */}
        <div className="flex items-center gap-2">
          <div className="flex items-center h-8 border border-line rounded-md overflow-hidden">
            {(["volume", "players", "odds"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 h-full text-[11px] font-mono uppercase tracking-wider transition-all ${
                  sort === s
                    ? "bg-bg-above text-fg font-semibold"
                    : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Link
            href="/dashboard/create"
            className="h-8 px-3 text-[13px] font-semibold bg-green text-white rounded-md hover:opacity-90 hover:shadow-lg hover:shadow-green/20 transition-all flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create
          </Link>
        </div>
      </div>

      {/* ── Market count ── */}
      <div className="text-[12px] font-mono text-fg-muted">
        {filtered.length} market{filtered.length !== 1 ? "s" : ""}
        {cat !== "All" && ` in ${cat}`}
      </div>

      {/* ── Market grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
        <AnimatePresence mode="popLayout">
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="bg-bg p-4 hover:bg-bg-above/30 transition-colors cursor-pointer group"
            >
              <Link href={`/dashboard/markets/${m.id}`} className="block">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-mono text-fg-muted bg-bg-above px-1.5 py-0.5 rounded">
                        {m.category}
                      </span>
                      {m.hot && (
                        <span className="text-[9px] font-mono text-amber font-bold bg-amber/10 px-1.5 py-0.5 rounded">
                          HOT
                        </span>
                      )}
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        m.status === "VOTING"
                          ? "bg-amber/10 text-amber"
                          : "bg-green/10 text-green"
                      }`}>
                        {m.status === "LIVE" && <span className="inline-block w-1 h-1 rounded-full bg-green mr-1 animate-pulse" />}
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[15px] font-medium leading-snug group-hover:text-green transition-colors">
                      {m.q}
                    </p>
                  </div>
                  <div className="w-16 shrink-0 opacity-30 group-hover:opacity-60 transition-opacity">
                    <Sparkline data={m.trend} color={m.odds >= 50 ? "#22c55e" : "#ef4444"} height={32} />
                  </div>
                </div>

                {/* Odds with multipliers (Kalshi style) */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-green/5 border border-green/10 rounded-md px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-fg-muted uppercase block">Yes</span>
                      <span className="text-[18px] font-mono font-bold text-green leading-none">{m.odds}%</span>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-green bg-green/10 px-1.5 py-0.5 rounded">
                      {(100 / m.odds).toFixed(1)}x
                    </span>
                  </div>
                  <div className="bg-red/5 border border-red/10 rounded-md px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-fg-muted uppercase block">No</span>
                      <span className="text-[18px] font-mono font-bold text-red leading-none">{100 - m.odds}%</span>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-red bg-red/10 px-1.5 py-0.5 rounded">
                      {(100 / (100 - m.odds)).toFixed(1)}x
                    </span>
                  </div>
                </div>

                {/* Footer stats + Join button */}
                <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {m.players}
                    </span>
                    <span>Vol: {m.volume}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {m.endDate}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex justify-end mt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); joinMarket(m); }}
                  className={`h-7 px-3 text-[11px] font-mono font-semibold rounded transition-all ${
                    joined.has(m.id)
                      ? "bg-green/10 text-green border border-green/20"
                      : "bg-green text-white hover:shadow-md hover:shadow-green/20"
                  }`}
                >
                  {joined.has(m.id) ? "✓ Joined" : "Bet Now"}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Why create? Upgraded CTA ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Link href="/dashboard/create">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="relative border border-dashed border-green/30 rounded-lg p-6 text-center cursor-pointer hover:bg-green/3 hover:border-green/50 transition-all overflow-hidden group"
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-green/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-fg-secondary mb-1">
                Can&apos;t find what you&apos;re looking for?
              </p>
              <p className="text-[13px] text-fg-muted">
                Create your own bet — set stakes, invite friends, pick a referee
              </p>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
