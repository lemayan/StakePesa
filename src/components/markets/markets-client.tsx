"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type OutcomeOdds = {
  outcome: string;
  poolCents: number;
  poolPercentage: number;
  decimalOdds: number;
  impliedProbability: number;
  netMultiplier: number;
  hasAction: boolean;
};

type MarketEntry = {
  id: string;
  title: string;
  category: string;
  options: { name: string; probability: number }[];
  totalPoolCents: number;
  hasLiveOdds: boolean;
  outcomes: OutcomeOdds[];
};

const CATEGORIES = ["All", "sports", "politics", "finance", "crypto", "tech", "economics", "climate", "health"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  All: "All",
  sports: "Sports",
  politics: "Politics",
  finance: "Finance",
  crypto: "Crypto",
  tech: "Tech",
  economics: "Economics",
  climate: "Climate",
  health: "Health",
};

const CATEGORY_EMOJI: Record<string, string> = {
  sports: "⚽",
  politics: "🏛️",
  finance: "💹",
  crypto: "₿",
  tech: "🤖",
  economics: "📊",
  climate: "🌍",
  health: "🏥",
};

function formatKES(cents: number) {
  if (cents === 0) return "KES 0";
  if (cents >= 100_000_00) return `KES ${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 100_00) return `KES ${(cents / 100_00).toFixed(1)}K`;
  return `KES ${(cents / 100).toFixed(0)}`;
}

function getBestOdds(outcomes: OutcomeOdds[]) {
  if (!outcomes.length) return null;
  return outcomes.reduce((best, o) =>
    o.decimalOdds > best.decimalOdds ? o : best, outcomes[0]
  );
}

function OddsBar({ outcomes }: { outcomes: OutcomeOdds[] }) {
  const top = outcomes.slice(0, 3);
  const total = top.reduce((s, o) => s + o.poolPercentage, 0);

  return (
    <div className="h-1 w-full rounded-full overflow-hidden flex bg-line">
      {top.map((o, i) => {
        const pct = total > 0 ? (o.poolPercentage / total) * 100 : 100 / top.length;
        const colors = ["bg-green", "bg-amber", "bg-red"];
        return (
          <div
            key={o.outcome}
            className={`${colors[i] ?? "bg-fg-muted"} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

export function MarketsClient({ markets }: { markets: MarketEntry[] }) {
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<"pool" | "odds" | "new">("pool");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = markets;
    if (cat !== "All") list = list.filter((m) => m.category === cat);
    if (search.trim()) list = list.filter((m) =>
      m.title.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "pool") list = [...list].sort((a, b) => b.totalPoolCents - a.totalPoolCents);
    if (sort === "odds") list = [...list].sort((a, b) => {
      const bBest = getBestOdds(b.outcomes)?.decimalOdds ?? 0;
      const aBest = getBestOdds(a.outcomes)?.decimalOdds ?? 0;
      return bBest - aBest;
    });
    return list;
  }, [markets, cat, sort, search]);

  const activeCats = CATEGORIES.filter((c) =>
    c === "All" || markets.some((m) => m.category === c)
  );

  return (
    <div className="max-w-6xl space-y-6">

      {/* ── Hero bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Live Markets</h1>
          <p className="text-[13px] text-fg-muted mt-0.5">
            Bet on real outcomes · Powered by pari-mutuel odds
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="h-9 px-4 text-[13px] font-semibold bg-green text-white rounded-lg hover:opacity-90 hover:shadow-lg hover:shadow-green/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          P2P Challenge
        </Link>
      </div>

      {/* ── Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-[13px] bg-bg-above border border-line rounded-lg placeholder:text-fg-muted focus:outline-none focus:border-green/50 transition-colors"
          />
        </div>
        <div className="flex items-center h-9 border border-line rounded-lg overflow-hidden">
          {(["pool", "odds", "new"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 h-full text-[11px] font-mono uppercase tracking-wider transition-all ${
                sort === s ? "bg-bg-above text-fg font-semibold" : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              {s === "pool" ? "Pool" : s === "odds" ? "Odds" : "New"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {activeCats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`relative h-8 px-3 text-[12px] font-mono whitespace-nowrap rounded-lg transition-all ${
              cat === c
                ? "text-green font-semibold"
                : "text-fg-muted hover:text-fg-secondary hover:bg-bg-above"
            }`}
          >
            {cat === c && (
              <motion.div
                layoutId="market-cat-pill"
                className="absolute inset-0 bg-green/8 rounded-lg border border-green/15"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">
              {c !== "All" && <span className="mr-1">{CATEGORY_EMOJI[c]}</span>}
              {CATEGORY_LABELS[c] ?? c}
            </span>
          </button>
        ))}
      </div>

      {/* ── Count ── */}
      <p className="text-[11px] font-mono text-fg-muted">
        {filtered.length} market{filtered.length !== 1 ? "s" : ""}
        {cat !== "All" && ` · ${CATEGORY_LABELS[cat] ?? cat}`}
        {search && ` · "${search}"`}
      </p>

      {/* ── Market grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line rounded-xl overflow-hidden">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <div className="col-span-2 bg-bg py-14 text-center text-sm text-fg-muted">
              No markets match your search.
            </div>
          )}
          {filtered.map((market, i) => {
            const bestOdds = getBestOdds(market.outcomes);
            const top2 = market.outcomes.slice(0, 2);

            return (
              <motion.article
                key={market.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="bg-bg hover:bg-bg-above/40 transition-colors group"
              >
                <Link href={`/dashboard/markets/${market.id}`} prefetch className="block p-5">
                  {/* Category + live badge */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[10px] font-mono text-fg-muted bg-bg-above px-2 py-0.5 rounded-md">
                      {CATEGORY_EMOJI[market.category]} {CATEGORY_LABELS[market.category] ?? market.category}
                    </span>
                    {market.hasLiveOdds ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-green/10 text-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-green animate-livepulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-above text-fg-muted">
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-[15px] font-semibold leading-snug group-hover:text-green transition-colors mb-4">
                    {market.title}
                  </p>

                  {/* Top 2 outcomes with real odds */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {top2.map((o, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div
                          key={o.outcome}
                          className={`rounded-lg px-3 py-2 border ${
                            isFirst
                              ? "bg-green/5 border-green/10"
                              : "bg-red/5 border-red/10"
                          }`}
                        >
                          <span className={`text-[9px] font-mono uppercase tracking-wider block mb-0.5 ${isFirst ? "text-green/70" : "text-red/70"}`}>
                            {o.outcome.length > 14 ? o.outcome.slice(0, 13) + "…" : o.outcome}
                          </span>
                          <div className="flex items-end gap-1.5">
                            <span className={`text-[20px] font-mono font-bold leading-none ${isFirst ? "text-green" : "text-red"}`}>
                              {o.decimalOdds.toFixed(2)}
                              <span className="text-[11px] font-normal">x</span>
                            </span>
                            <span className={`text-[10px] font-mono mb-0.5 ${isFirst ? "text-green/70" : "text-red/70"}`}>
                              {(o.impliedProbability * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pool bar */}
                  <OddsBar outcomes={market.outcomes} />

                  {/* Footer stats */}
                  <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-fg-muted">
                    <div className="flex items-center gap-3">
                      <span>Pool: {formatKES(market.totalPoolCents)}</span>
                      {market.outcomes.length > 2 && (
                        <span>+{market.outcomes.length - 2} more</span>
                      )}
                    </div>
                    {bestOdds && (
                      <span className="text-green font-semibold">
                        Best: {bestOdds.decimalOdds.toFixed(2)}x
                      </span>
                    )}
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── CTA: P2P Challenge ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Link href="/dashboard/create">
          <motion.div
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className="relative border border-dashed border-green/30 rounded-xl p-6 text-center cursor-pointer hover:bg-green/3 hover:border-green/50 transition-all overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-fg-secondary mb-1">
                Want a private challenge with friends?
              </p>
              <p className="text-[13px] text-fg-muted">
                Create a P2P challenge — set your own stake, invite friends, pick a referee
              </p>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
