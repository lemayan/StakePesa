"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityItem {
  id: number;
  type: "bet" | "win" | "loss" | "deposit" | "withdraw" | "referral";
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  status: "completed" | "pending" | "processing";
  market?: string;
}

const activities: ActivityItem[] = [
  { id: 1, type: "bet", title: "Bought YES", subtitle: "Arsenal wins the Premier League 2025", amount: "-1,500 KES", date: "Today · 2:41 PM", status: "completed", market: "Arsenal wins the Premier League 2025" },
  { id: 2, type: "win", title: "Market resolved — WIN", subtitle: "No sugar for 3 days challenge", amount: "+2,000 KES", date: "Today · 9:12 AM", status: "completed", market: "No sugar for 3 days challenge" },
  { id: 3, type: "deposit", title: "Deposit received", subtitle: "Paystack top up", amount: "+5,000 KES", date: "Yesterday · 5:45 PM", status: "completed" },
  { id: 4, type: "bet", title: "Bought NO", subtitle: "BTC above $100k by end of 2025", amount: "-2,500 KES", date: "Yesterday · 1:08 PM", status: "completed", market: "BTC above $100k by end of 2025" },
  { id: 5, type: "withdraw", title: "Withdrawal requested", subtitle: "To Equity Bank ****0214", amount: "-3,000 KES", date: "Mar 10 · 10:03 AM", status: "processing" },
  { id: 6, type: "loss", title: "Market resolved — LOSS", subtitle: "KES/USD hits 125 by Q2", amount: "-800 KES", date: "Mar 9 · 6:30 PM", status: "completed", market: "KES/USD hits 125 by Q2" },
  { id: 7, type: "referral", title: "Referral bonus", subtitle: "Sarah N. joined with your invite", amount: "+500 KES", date: "Mar 8 · 11:15 AM", status: "completed" },
  { id: 8, type: "bet", title: "Bought YES", subtitle: "Man City vs Real Madrid UCL winner", amount: "-1,000 KES", date: "Mar 7 · 8:22 PM", status: "pending", market: "Man City vs Real Madrid UCL winner" },
  { id: 9, type: "deposit", title: "Deposit received", subtitle: "M-Pesa top up", amount: "+1,000 KES", date: "Mar 6 · 3:04 PM", status: "completed" },
  { id: 10, type: "win", title: "Market resolved — WIN", subtitle: "Morning run streak", amount: "+4,200 KES", date: "Mar 5 · 8:00 AM", status: "completed", market: "Morning run streak" },
];

const filters = ["All", "Bets", "Settlements", "Transactions", "Referrals"] as const;
type Filter = (typeof filters)[number];

const typeMeta = {
  bet: { icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z", color: "text-blue-400", bg: "bg-blue-400/10" },
  win: { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-green", bg: "bg-green/10" },
  loss: { icon: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-red", bg: "bg-red/10" },
  deposit: { icon: "M12 4.5v15m7.5-7.5h-15", color: "text-fg-secondary", bg: "bg-bg-above" },
  withdraw: { icon: "M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75", color: "text-amber", bg: "bg-amber/10" },
  referral: { icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197", color: "text-green", bg: "bg-green/10" },
};

export default function ActivityPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Bets" && a.type === "bet") ||
        (filter === "Settlements" && ["win", "loss"].includes(a.type)) ||
        (filter === "Transactions" && ["deposit", "withdraw"].includes(a.type)) ||
        (filter === "Referrals" && a.type === "referral");

      const matchesQuery =
        query.length === 0 ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(query.toLowerCase());

      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  const totals = {
    pnl: activities
      .filter((a) => ["win", "loss", "bet"].includes(a.type))
      .reduce((acc, a) => acc + Number(a.amount.replace(/[^0-9-]/g, "")), 0),
    volume: activities
      .filter((a) => ["bet", "win", "loss"].includes(a.type))
      .reduce((acc, a) => acc + Math.abs(Number(a.amount.replace(/[^0-9-]/g, ""))), 0),
    txns: activities.length,
  };

  return (
    <div className="max-w-5xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[18px] font-bold">Activity</h1>
          <p className="text-[13px] text-fg-muted mt-0.5">Your full betting and wallet history</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity..."
            className="h-9 px-3 text-[13px] bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-lg overflow-hidden"
      >
        {[
          { label: "Net P&L", value: `${totals.pnl > 0 ? "+" : ""}${totals.pnl.toLocaleString()}`, unit: "KES", color: totals.pnl >= 0 ? "text-green" : "text-red" },
          { label: "Trading Volume", value: totals.volume.toLocaleString(), unit: "KES", color: "text-fg" },
          { label: "Activities", value: totals.txns.toString(), unit: "events", color: "text-fg" },
          { label: "Open Bets", value: activities.filter((a) => a.status === "pending").length.toString(), unit: "markets", color: "text-amber" },
        ].map((s, i) => (
          <div key={i} className="bg-bg p-4">
            <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">{s.label}</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-[28px] font-mono font-bold leading-none ${s.color}`}>{s.value}</span>
              <span className="text-[12px] font-mono text-fg-muted">{s.unit}</span>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1"
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative h-8 px-3 text-[13px] font-mono whitespace-nowrap rounded-md transition-all ${
              filter === f
                ? "text-green font-semibold"
                : "text-fg-muted hover:text-fg-secondary hover:bg-bg-above"
            }`}
          >
            {filter === f && (
              <motion.div
                layoutId="activity-filter"
                className="absolute inset-0 bg-green/8 rounded-md border border-green/15"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{f}</span>
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-line rounded-lg overflow-hidden"
      >
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-[14px] text-fg-muted"
            >
              No activity found
            </motion.div>
          ) : (
            filtered.map((item, i) => {
              const meta = typeMeta[item.type];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0 hover:bg-bg-above/40 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <svg className={`w-4 h-4 ${meta.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium">{item.title}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        item.status === "completed" ? "bg-green/10 text-green" :
                        item.status === "processing" ? "bg-amber/10 text-amber" :
                        "bg-blue-400/10 text-blue-400"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-fg-muted mt-0.5 truncate">{item.subtitle}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-fg-muted">
                      <span>{item.date}</span>
                      {item.market && (
                        <>
                          <span>·</span>
                          <span className="truncate">{item.market}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className={`text-[14px] font-mono font-semibold shrink-0 ${
                    item.amount.startsWith("+") ? "text-green" : "text-fg-secondary"
                  }`}>
                    {item.amount}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
