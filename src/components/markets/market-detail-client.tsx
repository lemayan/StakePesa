"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { placeBetAction, estimatePayoutAction } from "@/actions/market";

type OutcomeOdds = {
  outcome: string;
  poolCents: number;
  poolPercentage: number;
  decimalOdds: number;
  impliedProbability: number;
  netMultiplier: number;
  hasAction: boolean;
};

type Market = {
  id: string;
  title: string;
  category: string;
  options: { name: string; probability: number }[];
  news?: { headline: string; summary: string; impact: string; confidence: number }[];
};

type Props = {
  market: Market;
  outcomes: OutcomeOdds[];
  totalPoolCents: number;
  prizePoolCents: number;
  houseRevenueCents: number;
  houseMarginBps: number;
  hasLiveOdds: boolean;
  walletBalanceCents: number;
  isLoggedIn: boolean;
};

const PRESET_AMOUNTS_KES = [10, 50, 100, 500, 1000];

const CATEGORY_EMOJI: Record<string, string> = {
  sports: "⚽", politics: "🏛️", finance: "💹", crypto: "₿",
  tech: "🤖", economics: "📊", climate: "🌍", health: "🏥",
};

function formatKES(cents: number, compact = false) {
  const kes = cents / 100;
  if (compact && kes >= 1_000_000) return `KES ${(kes / 1_000_000).toFixed(1)}M`;
  if (compact && kes >= 1_000) return `KES ${(kes / 1_000).toFixed(1)}K`;
  return `KES ${kes.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function OddsBar({ outcomes }: { outcomes: OutcomeOdds[] }) {
  const colors = ["bg-green", "bg-amber", "bg-red", "bg-blue-400", "bg-purple-400"];
  return (
    <div className="h-2 flex w-full rounded-full overflow-hidden bg-line gap-px">
      {outcomes.map((o, i) => (
        <motion.div
          key={o.outcome}
          initial={{ width: 0 }}
          animate={{ width: `${o.poolPercentage}%` }}
          transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
          className={`${colors[i] ?? "bg-fg-muted"} h-full`}
          title={`${o.outcome}: ${o.poolPercentage}%`}
        />
      ))}
    </div>
  );
}

export function MarketDetailClient({
  market, outcomes, totalPoolCents, prizePoolCents, houseMarginBps,
  hasLiveOdds, walletBalanceCents, isLoggedIn,
}: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [stakeKES, setStakeKES] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [estimate, setEstimate] = useState<{ returnCents: number; profitCents: number; odds: number } | null>(null);
  const [placedBet, setPlacedBet] = useState<{ outcome: string; stakeCents: number; odds: number } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const stakeCents = Math.round((parseFloat(stakeKES) || 0) * 100);
  const isValidStake = stakeCents >= 1000; // min KES 10
  const isCooldownActive = (cooldownSeconds ?? 0) > 0;
  const canBet = isLoggedIn && selectedOutcome && isValidStake && !isCooldownActive;

  useEffect(() => {
    if (!isCooldownActive) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (!prev || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCooldownActive]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const showToast = (type: "success" | "error" | "info", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOutcomeSelect = useCallback((outcome: string) => {
    setSelectedOutcome(outcome);
    setEstimate(null);
    if (stakeKES && parseFloat(stakeKES) >= 10) {
      runEstimate(outcome, Math.round(parseFloat(stakeKES) * 100));
    }
  }, [stakeKES]);

  const handleStakeChange = useCallback((val: string) => {
    setStakeKES(val);
    const cents = Math.round((parseFloat(val) || 0) * 100);
    if (selectedOutcome && cents >= 1000) {
      runEstimate(selectedOutcome, cents);
    } else {
      setEstimate(null);
    }
  }, [selectedOutcome]);

  const runEstimate = (outcome: string, cents: number) => {
    startTransition(async () => {
      const res = await estimatePayoutAction(market.id, outcome, cents);
      if (res.success) {
        setEstimate({
          returnCents: res.estimatedReturnCents!,
          profitCents: res.estimatedProfitCents!,
          odds: res.currentOdds!,
        });
      }
    });
  };

  const handlePlaceBet = () => {
    if (!canBet || !selectedOutcome) return;
    startTransition(async () => {
      const res = await placeBetAction({
        marketId: market.id,
        outcome: selectedOutcome,
        stakeCents,
        requestId: crypto.randomUUID(),
      });
      if (res.success) {
        setPlacedBet({ outcome: selectedOutcome, stakeCents, odds: res.oddsAtPlacement! });
        setSelectedOutcome(null);
        setStakeKES("");
        setEstimate(null);
        showToast("success", `Bet placed at ${res.oddsAtPlacement?.toFixed(2)}x odds! 🎉`);
      } else {
        if (typeof res.retryAfterSeconds === "number" && res.retryAfterSeconds > 0) {
          setCooldownSeconds(res.retryAfterSeconds);
          showToast(
            "error",
            `Bet locked for ${formatCooldown(res.retryAfterSeconds)} due to fraud cooldown.`
          );
          return;
        }
        showToast("error", res.error ?? "Bet failed. Please try again.");
      }
    });
  };

  return (
    <div className="max-w-4xl space-y-6">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-[13px] font-medium max-w-xs ${
              toast.type === "success"
                ? "bg-green text-white"
                : toast.type === "error"
                  ? "bg-red text-white"
                  : "bg-bg-above border border-line text-fg"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Back + breadcrumb ── */}
      <div className="flex items-center gap-2 text-[12px] font-mono text-fg-muted">
        <Link href="/dashboard/markets" className="hover:text-fg transition-colors">
          ← Markets
        </Link>
        <span>/</span>
        <span className="text-fg-secondary truncate max-w-50">{market.title}</span>
      </div>

      {/* ── Market header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-fg-muted bg-bg-above px-2 py-0.5 rounded-md">
            {CATEGORY_EMOJI[market.category]} {market.category}
          </span>
          {hasLiveOdds ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-green/10 text-green">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-livepulse" />
              LIVE ODDS
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-bg-above text-fg-muted border border-line">
              SEED ODDS — Be the first to bet!
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          {market.title}
        </h1>

        {/* Pool stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Pool", value: formatKES(totalPoolCents, true), color: "text-fg" },
            { label: "Prize Pool", value: formatKES(prizePoolCents, true), color: "text-green" },
            { label: "House Edge", value: `${(houseMarginBps / 100).toFixed(0)}%`, color: "text-amber" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-bg-above/30 p-3">
              <p className="text-[11px] font-mono text-fg-muted mb-1">{stat.label}</p>
              <p className={`text-[18px] font-mono font-bold ${stat.color} tabular-nums`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pool distribution bar ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Pool Distribution</p>
        <OddsBar outcomes={outcomes} />
        <div className="flex flex-wrap gap-3 mt-2">
          {outcomes.map((o, i) => {
            const colors = ["text-green", "text-amber", "text-red", "text-blue-400", "text-purple-400"];
            const dots = ["bg-green", "bg-amber", "bg-red", "bg-blue-400", "bg-purple-400"];
            return (
              <div key={o.outcome} className="flex items-center gap-1.5 text-[11px] font-mono text-fg-muted">
                <div className={`w-2 h-2 rounded-full ${dots[i] ?? "bg-fg-muted"}`} />
                <span>{o.outcome.length > 18 ? o.outcome.slice(0, 17) + "…" : o.outcome}</span>
                <span className={`font-semibold ${colors[i] ?? "text-fg"}`}>{o.poolPercentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Outcomes (left 3 cols) ── */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Pick Your Outcome</p>
          {outcomes.map((o) => {
            const isSelected = selectedOutcome === o.outcome;
            const isLoser = selectedOutcome && selectedOutcome !== o.outcome;
            return (
              <motion.button
                key={o.outcome}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                onClick={() => handleOutcomeSelect(o.outcome)}
                disabled={!isLoggedIn}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? "border-green bg-green/8 shadow-lg shadow-green/10"
                    : isLoser
                      ? "border-line bg-bg opacity-50"
                      : "border-line bg-bg hover:border-line-bright hover:bg-bg-above/40"
                } ${!isLoggedIn ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "border-green" : "border-line-bright"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-green" />}
                      </div>
                      <p className="text-[14px] font-semibold truncate">{o.outcome}</p>
                    </div>
                    {/* Mini pool bar */}
                    <div className="flex items-center gap-2 ml-6">
                      <div className="flex-1 h-1 bg-line rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${o.poolPercentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-green/50 rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-fg-muted">
                        {formatKES(o.poolCents, true)} staked
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[22px] font-mono font-bold tabular-nums leading-none ${
                      isSelected ? "text-green" : "text-fg"
                    }`}>
                      {o.decimalOdds.toFixed(2)}
                      <span className="text-[13px] font-normal text-fg-muted">x</span>
                    </p>
                    <p className="text-[10px] font-mono text-fg-muted mt-0.5">
                      {(o.impliedProbability * 100).toFixed(1)}% implied
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}

          {!isLoggedIn && (
            <div className="border border-dashed border-line rounded-xl p-4 text-center">
              <p className="text-[13px] text-fg-muted mb-2">Log in to place a bet</p>
              <Link href="/login" className="h-8 px-4 text-[12px] font-semibold bg-green text-white rounded-lg inline-flex items-center hover:opacity-90">
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* ── Bet panel (right 2 cols) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Wallet balance */}
          {isLoggedIn && (
            <div className="rounded-xl border border-line bg-bg-above/20 p-3 flex items-center justify-between">
              <span className="text-[12px] font-mono text-fg-muted">Wallet</span>
              <span className="text-[14px] font-mono font-bold tabular-nums">
                {formatKES(walletBalanceCents)}
              </span>
            </div>
          )}

          {/* Stake input */}
          <div className="rounded-xl border border-line bg-bg p-4 space-y-3">
            <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Your Stake (KES)</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-mono text-fg-muted">KES</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={stakeKES}
                onChange={(e) => handleStakeChange(e.target.value)}
                min={10}
                max={100000}
                disabled={!isLoggedIn}
                className="w-full h-11 pl-12 pr-3 text-[16px] font-mono font-bold bg-bg-above rounded-lg border border-line focus:outline-none focus:border-green/50 transition-colors tabular-nums disabled:opacity-50"
              />
            </div>

            {/* Quick-pick preset amounts */}
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_AMOUNTS_KES.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleStakeChange(amt.toString())}
                  disabled={!isLoggedIn}
                  className={`h-7 px-2.5 text-[11px] font-mono rounded-md border transition-all ${
                    parseFloat(stakeKES) === amt
                      ? "border-green bg-green/8 text-green"
                      : "border-line text-fg-muted hover:border-line-bright hover:text-fg-secondary"
                  } disabled:opacity-50`}
                >
                  {amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>

            {/* Payout estimate */}
            <AnimatePresence>
              {estimate && selectedOutcome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-green/20 bg-green/5 p-3 space-y-1.5"
                >
                  <p className="text-[10px] font-mono text-green/70 uppercase tracking-wider">Estimated Payout</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono text-fg-muted">If {selectedOutcome} wins</span>
                    <span className="text-[16px] font-mono font-bold text-green tabular-nums">
                      {formatKES(estimate.returnCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-fg-muted">Net profit</span>
                    <span className={`text-[12px] font-mono font-semibold tabular-nums ${
                      estimate.profitCents >= 0 ? "text-green" : "text-red"
                    }`}>
                      {estimate.profitCents >= 0 ? "+" : ""}{formatKES(estimate.profitCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-green/10 pt-1.5">
                    <span className="text-[11px] font-mono text-fg-muted">Current odds</span>
                    <span className="text-[12px] font-mono font-bold text-green">{estimate.odds.toFixed(2)}x</span>
                  </div>
                  <p className="text-[9px] font-mono text-fg-muted">
                    * Estimates vary as more bets are placed (pari-mutuel)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Validation messages */}
            {stakeKES && stakeCents < 1000 && (
              <p className="text-[11px] font-mono text-red">Minimum bet is KES 10</p>
            )}
            {stakeCents > walletBalanceCents && isLoggedIn && (
              <p className="text-[11px] font-mono text-red">Insufficient wallet balance</p>
            )}
            {isCooldownActive && (
              <p className="text-[11px] font-mono text-amber">
                Betting cooldown active: {formatCooldown(cooldownSeconds ?? 0)} remaining
              </p>
            )}

            {/* Place bet button */}
            <motion.button
              whileHover={canBet ? { scale: 1.01 } : {}}
              whileTap={canBet ? { scale: 0.98 } : {}}
              onClick={handlePlaceBet}
              disabled={!canBet || isPending}
              className={`w-full h-11 rounded-xl text-[14px] font-bold transition-all ${
                canBet && !isPending
                  ? "bg-green text-white hover:opacity-90 shadow-lg shadow-green/20 animate-glow"
                  : "bg-bg-above text-fg-muted cursor-not-allowed"
              }`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Placing bet…
                </span>
              ) : isCooldownActive ? `Locked ${formatCooldown(cooldownSeconds ?? 0)}` : !selectedOutcome ? "Select an outcome" : !isValidStake ? "Enter stake (min KES 10)" : `Bet ${stakeKES ? `KES ${parseFloat(stakeKES).toLocaleString()}` : ""} on ${selectedOutcome}`}
            </motion.button>

            <p className="text-[10px] font-mono text-fg-muted text-center">
              5% house margin · Pari-mutuel payout · Funds locked until resolution
            </p>
          </div>

          {/* Recent placed bet confirmation */}
          <AnimatePresence>
            {placedBet && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-green/30 bg-green/5 p-4"
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-[12px] font-semibold text-green">Bet confirmed!</p>
                    <p className="text-[11px] font-mono text-fg-muted mt-0.5">
                      {formatKES(placedBet.stakeCents)} on <strong>{placedBet.outcome}</strong> · {placedBet.odds.toFixed(2)}x
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Low wallet warning */}
          {isLoggedIn && walletBalanceCents < 1000 && (
            <div className="rounded-xl border border-amber/20 bg-amber/5 p-3 text-[12px] font-mono text-amber">
              <p className="font-semibold mb-0.5">Low balance</p>
              <Link href="/dashboard/wallet" className="text-[11px] underline">
                Top up your wallet →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── News section ── */}
      {market.news && market.news.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-line">
          <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Market Context & News</p>
          <div className="space-y-2">
            {market.news.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-line bg-bg-above/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${
                    item.impact.includes("positive") ? "bg-green" :
                    item.impact.includes("negative") ? "bg-red" : "bg-amber"
                  }`} />
                  <div>
                    <p className="text-[13px] font-semibold leading-snug">{item.headline}</p>
                    <p className="text-[12px] text-fg-muted mt-1">{item.summary}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono text-fg-muted">
                        Confidence: {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── How pari-mutuel works ── */}
      <div className="rounded-xl border border-line bg-bg-above/10 p-4 space-y-2">
        <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">How odds work</p>
        <p className="text-[12px] text-fg-secondary leading-relaxed">
          StakePesa uses <strong>pari-mutuel pricing</strong> — odds are calculated from the actual pool of bets, not set by a bookmaker.
          The more people bet on an outcome, the lower its odds get. Early bettors on popular outcomes earn less;
          early bettors on surprise outcomes earn more. The platform takes a fixed 5% margin; the rest is shared among winners.
        </p>
      </div>
    </div>
  );
}
