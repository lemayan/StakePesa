"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ── Mock leaderboard data ── */
const leaderboardData = [
  { rank: 1, name: "David M.", avatar: "DM", wins: 47, winRate: 78, profit: 142500, streak: 8, badge: "🏆", tier: "Diamond" },
  { rank: 2, name: "Sarah N.", avatar: "SN", wins: 41, winRate: 74, profit: 118300, streak: 5, badge: "🥈", tier: "Diamond" },
  { rank: 3, name: "James K.", avatar: "JK", wins: 38, winRate: 71, profit: 96800, streak: 3, badge: "🥉", tier: "Platinum" },
  { rank: 4, name: "Grace W.", avatar: "GW", wins: 35, winRate: 69, profit: 84200, streak: 6, badge: "", tier: "Platinum" },
  { rank: 5, name: "Peter N.", avatar: "PN", wins: 33, winRate: 67, profit: 72100, streak: 4, badge: "", tier: "Gold" },
  { rank: 6, name: "Alice T.", avatar: "AT", wins: 30, winRate: 65, profit: 61500, streak: 2, badge: "", tier: "Gold" },
  { rank: 7, name: "Brian O.", avatar: "BO", wins: 28, winRate: 63, profit: 55800, streak: 7, badge: "", tier: "Gold" },
  { rank: 8, name: "Mike L.", avatar: "ML", wins: 26, winRate: 61, profit: 48200, streak: 1, badge: "", tier: "Silver" },
  { rank: 9, name: "Chris P.", avatar: "CP", wins: 24, winRate: 59, profit: 41000, streak: 3, badge: "", tier: "Silver" },
  { rank: 10, name: "Jane D.", avatar: "JD", wins: 22, winRate: 57, profit: 35600, streak: 2, badge: "", tier: "Silver" },
  { rank: 11, name: "Ken W.", avatar: "KW", wins: 20, winRate: 55, profit: 29400, streak: 0, badge: "", tier: "Bronze" },
  { rank: 12, name: "Tom K.", avatar: "TK", wins: 18, winRate: 53, profit: 24100, streak: 1, badge: "", tier: "Bronze" },
];

const periods = ["All Time", "This Month", "This Week"] as const;
type Period = (typeof periods)[number];

const metrics = ["profit", "wins", "winRate", "streak"] as const;
type Metric = (typeof metrics)[number];

const metricLabels: Record<Metric, string> = {
  profit: "Profit",
  wins: "Wins",
  winRate: "Win Rate",
  streak: "Streak",
};

const tierColors: Record<string, string> = {
  Diamond: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Platinum: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Gold: "text-amber bg-amber/10 border-amber/20",
  Silver: "text-fg-muted bg-bg-above border-line",
  Bronze: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("All Time");
  const [metric, setMetric] = useState<Metric>("profit");

  const sorted = [...leaderboardData].sort((a, b) => {
    return (b[metric] as number) - (a[metric] as number);
  }).map((p, i) => ({ ...p, rank: i + 1 }));

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // "You" mock
  const yourRank = { rank: 24, name: "You", avatar: "YO", wins: 15, winRate: 65, profit: 8450, streak: 4, badge: "", tier: "Bronze" };

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-[18px] font-bold flex items-center gap-2">
            🏆 Leaderboard
          </h1>
          <p className="text-[13px] text-fg-muted mt-0.5">Top performers on Stake Pesa</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center h-8 border border-line rounded-md overflow-hidden">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 h-full text-[11px] font-mono uppercase tracking-wider whitespace-nowrap transition-all ${
                  period === p
                    ? "bg-bg-above text-fg font-semibold"
                    : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Metric tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-1"
      >
        {metrics.map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`relative h-8 px-3 text-[13px] font-mono rounded-md transition-all ${
              metric === m ? "text-green font-semibold" : "text-fg-muted hover:text-fg-secondary hover:bg-bg-above"
            }`}
          >
            {metric === m && (
              <motion.div
                layoutId="lb-metric"
                className="absolute inset-0 bg-green/8 rounded-md border border-green/15"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{metricLabels[m]}</span>
          </button>
        ))}
      </motion.div>

      {/* ── Top 3 podium ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[top3[1], top3[0], top3[2]].map((p, i) => {
          if (!p) return null;
          const podiumOrder = [2, 1, 3];
          const heights = ["h-28", "h-36", "h-24"];
          const badges = ["🥈", "🏆", "🥉"];
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 200 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-2">
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-[16px] font-mono font-bold ${
                  i === 1 ? "border-amber bg-amber/10 text-amber" :
                  i === 0 ? "border-fg-muted bg-bg-above text-fg-secondary" :
                  "border-orange-400 bg-orange-400/10 text-orange-400"
                }`}>
                  {p.avatar}
                </div>
                <span className="absolute -bottom-1 -right-1 text-[16px]">{badges[i]}</span>
              </div>
              <span className="text-[13px] font-semibold">{p.name}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border mt-1 ${tierColors[p.tier]}`}>
                {p.tier}
              </span>
              <div className={`${heights[i]} w-full mt-3 rounded-t-lg flex flex-col items-center justify-end pb-3 ${
                i === 1 ? "bg-amber/8 border border-amber/15" :
                i === 0 ? "bg-bg-above border border-line" :
                "bg-orange-400/5 border border-orange-400/10"
              }`}>
                <span className="text-[24px] font-mono font-bold leading-none">#{podiumOrder[i]}</span>
                <span className="text-[12px] font-mono text-fg-muted mt-1">
                  {metric === "profit" && `${(p.profit / 1000).toFixed(1)}K KES`}
                  {metric === "wins" && `${p.wins} wins`}
                  {metric === "winRate" && `${p.winRate}%`}
                  {metric === "streak" && `${p.streak} streak`}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Your position ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="border border-green/20 bg-green/3 rounded-lg px-4 py-3 flex items-center gap-3"
      >
        <span className="text-[14px] font-mono font-bold text-fg-muted w-8 text-center">#{yourRank.rank}</span>
        <div className="w-8 h-8 rounded-full bg-green/10 border border-green/20 flex items-center justify-center text-[11px] font-mono font-bold text-green">
          {yourRank.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[14px] font-semibold text-green">You</span>
          <span className={`ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full border ${tierColors[yourRank.tier]}`}>
            {yourRank.tier}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[12px] font-mono text-fg-muted">
          <span>{yourRank.wins} wins</span>
          <span>{yourRank.winRate}% rate</span>
          <span className="text-green font-semibold">{yourRank.profit.toLocaleString()} KES</span>
        </div>
        <Link
          href="/dashboard/profile"
          className="text-[11px] font-mono text-green hover:underline shrink-0"
        >
          View Profile →
        </Link>
      </motion.div>

      {/* ── Full ranking table ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-line rounded-lg overflow-hidden"
      >
        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-[40px_1fr_80px_70px_70px_100px_60px] h-9 items-center px-4 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">Tier</span>
          <span className="text-center">Wins</span>
          <span className="text-center">Rate</span>
          <span className="text-right">Profit</span>
          <span className="text-center">🔥</span>
        </div>

        <AnimatePresence>
          {rest.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.03 }}
              className="grid grid-cols-[40px_1fr_80px_70px_70px_100px_60px] items-center px-4 py-2.5 border-b border-line last:border-b-0 hover:bg-bg-above/40 transition-colors"
            >
              <span className="text-[13px] font-mono font-bold text-fg-muted">{p.rank}</span>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-bg-above border border-line flex items-center justify-center text-[10px] font-mono font-bold text-fg-muted shrink-0">
                  {p.avatar}
                </div>
                <span className="text-[13px] font-medium truncate">{p.name}</span>
              </div>
              <div className="flex justify-center">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${tierColors[p.tier]}`}>
                  {p.tier}
                </span>
              </div>
              <span className="text-center text-[13px] font-mono text-fg-secondary">{p.wins}</span>
              <span className="text-center text-[13px] font-mono text-fg-secondary">{p.winRate}%</span>
              <span className="text-right text-[13px] font-mono text-green font-semibold">
                {p.profit.toLocaleString()}
              </span>
              <div className="flex justify-center">
                {p.streak > 0 && (
                  <span className="text-[11px] font-mono text-amber font-bold">
                    {p.streak}🔥
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── Tier legend ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border border-line rounded-lg p-4"
      >
        <h3 className="text-[12px] font-mono text-fg-muted uppercase tracking-wider mb-3">Tier System</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { tier: "Diamond", req: "Top 5%", icon: "💎" },
            { tier: "Platinum", req: "Top 15%", icon: "⚡" },
            { tier: "Gold", req: "Top 30%", icon: "🥇" },
            { tier: "Silver", req: "Top 50%", icon: "🥈" },
            { tier: "Bronze", req: "Everyone", icon: "🥉" },
          ].map((t) => (
            <div key={t.tier} className={`px-3 py-2 rounded-md border text-center ${tierColors[t.tier]}`}>
              <span className="text-[14px]">{t.icon}</span>
              <p className="text-[12px] font-mono font-semibold mt-0.5">{t.tier}</p>
              <p className="text-[10px] font-mono opacity-60">{t.req}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
