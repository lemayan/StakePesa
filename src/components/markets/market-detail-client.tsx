"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  placeBetAction,
  estimatePayoutAction,
  postCommentAction,
  getCommentsAction,
  getMarketOddsAction,
} from "@/actions/market";
import type { MarketCommentData } from "@/actions/market";

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
  initialSelectedOutcome?: string | null;
};

const PRESET_AMOUNTS_KES = [10, 50, 100, 500, 1000];

const CATEGORY_EMOJI: Record<string, string> = {
  sports: "⚽", politics: "🏛️", finance: "💹", crypto: "₿",
  tech: "🤖", economics: "📊", climate: "🌍", health: "🏥",
};

const OUTCOME_COLORS = [
  { stroke: "#22c55e", bg: "bg-green-500",   text: "text-green-400",   hex: "#22c55e" },
  { stroke: "#f59e0b", bg: "bg-amber-500",   text: "text-amber-400",   hex: "#f59e0b" },
  { stroke: "#ef4444", bg: "bg-red-500",     text: "text-red-400",     hex: "#ef4444" },
  { stroke: "#60a5fa", bg: "bg-blue-400",    text: "text-blue-400",    hex: "#60a5fa" },
  { stroke: "#a78bfa", bg: "bg-purple-400",  text: "text-purple-400",  hex: "#a78bfa" },
];

function formatKES(cents: number, compact = false) {
  const kes = cents / 100;
  if (compact && kes >= 1_000_000) return `KES ${(kes / 1_000_000).toFixed(1)}M`;
  if (compact && kes >= 1_000) return `KES ${(kes / 1_000).toFixed(1)}K`;
  return `KES ${kes.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({
  outcomes,
  totalPoolCents,
}: {
  outcomes: OutcomeOdds[];
  totalPoolCents: number;
}) {
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // If no pool yet, show equal ghost segments
  const hasPool = totalPoolCents > 0;
  const segments = outcomes.map((o, i) => ({
    ...o,
    pct: hasPool ? o.poolPercentage / 100 : 1 / outcomes.length,
    color: OUTCOME_COLORS[i] ?? OUTCOME_COLORS[0],
  }));

  let cumulativePct = 0;
  const GAP = 0.015; // gap between segments

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg, i) => {
          const segPct = Math.max(0, seg.pct - GAP);
          const offset = circumference * (1 - segPct);
          const rotation = cumulativePct * 360;
          cumulativePct += seg.pct;
          return (
            <motion.circle
              key={seg.outcome}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={hasPool ? seg.color.hex : "#ffffff10"}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
              strokeLinecap="butt"
              style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${rotation}deg)` }}
            />
          );
        })}
        {/* Inner ring glow */}
        <circle cx={cx} cy={cy} r={radius - strokeWidth / 2 - 4} fill="none" stroke="#ffffff05" strokeWidth={1} />
      </svg>

      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <p className="text-[10px] font-mono text-fg-muted uppercase tracking-wider">Total Pool</p>
        <p className="text-[16px] font-mono font-bold tabular-nums mt-0.5">
          {formatKES(totalPoolCents, true)}
        </p>
        {!hasPool && (
          <p className="text-[9px] font-mono text-fg-muted mt-1">No bets yet</p>
        )}
      </div>
    </div>
  );
}

// ── Animated Outcome Bar ──────────────────────────────────────────────────────

function OutcomeBar({ pct, colorHex }: { pct: number; colorHex: string }) {
  return (
    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${colorHex}80, ${colorHex})` }}
      />
    </div>
  );
}

function LivePriceChart({
  title,
  points,
  colorHex,
  nextRefreshIn,
  currentOdds,
  deltaPct,
}: {
  title: string;
  points: Array<{ t: number; value: number }>;
  colorHex: string;
  nextRefreshIn: number;
  currentOdds: number;
  deltaPct: number;
}) {
  const width = 760;
  const height = 240;
  const padX = 40;
  const padY = 16;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpread = Math.max(0.001, rawMax - rawMin);
  const center = (rawMax + rawMin) / 2;
  const paddedSpread = Math.max(rawSpread * 1.8, Math.max(0.02, center * 0.018));
  const min = center - paddedSpread / 2;
  const max = center + paddedSpread / 2;
  const spread = Math.max(0.001, max - min);

  const yTicks = [max, center, min];

  const formatTick = (value: number) => value.toFixed(2);
  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString("en-KE", { hour12: false, minute: "2-digit", second: "2-digit" });

  const firstPoint = points[0];
  const midPoint = points[Math.floor(points.length / 2)] ?? firstPoint;
  const lastPoint = points[points.length - 1] ?? firstPoint;

  const normalizeY = (value: number) => {
    const scaled = (value - min) / spread;
    return height - padY - scaled * (height - padY * 2);
  };

  const normalizeX = (idx: number) => {
    if (points.length <= 1) return padX;
    return padX + (idx / (points.length - 1)) * (width - padX * 2);
  };

  const path = points
    .map((point, idx) => `${idx === 0 ? "M" : "L"}${normalizeX(idx).toFixed(2)} ${normalizeY(point.value).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `${path} L ${normalizeX(points.length - 1).toFixed(2)} ${(height - padY).toFixed(2)} L ${normalizeX(0).toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  const lastX = normalizeX(points.length - 1);
  const lastY = normalizeY(lastPoint.value);

  return (
    <div className="rounded-2xl border border-line bg-bg-above/20 p-4 md:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Live Market Tape</p>
          <p className="text-[15px] font-semibold mt-1">{title}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-mono text-fg-muted">Next refresh in {nextRefreshIn}s</p>
          <p className="text-[18px] font-mono font-bold tabular-nums leading-none mt-1" style={{ color: colorHex }}>
            {currentOdds.toFixed(2)}x
          </p>
          <p className={`text-[10px] font-mono mt-0.5 ${deltaPct >= 0 ? "text-green" : "text-red"}`}>
            {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-bg/60 p-2 md:p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-55 md:h-60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="live-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.28" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, idx) => {
            const y = normalizeY(tick);
            return (
              <g key={`y-tick-${idx}`}>
                <line
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke={idx === 1 ? "#ffffff2e" : "#ffffff15"}
                  strokeWidth="1"
                  strokeDasharray={idx === 1 ? "0" : "3 4"}
                />
                <text
                  x={padX - 5}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#8f9bb1"
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                >
                  {formatTick(tick)}x
                </text>
              </g>
            );
          })}

          <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#ffffff33" strokeWidth="1" />
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#ffffff33" strokeWidth="1" />

          <motion.path
            d={areaPath}
            fill="url(#live-chart-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          />

          <motion.path
            d={path}
            fill="none"
            stroke={colorHex}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4 }}
          />

          <motion.circle
            cx={lastX}
            cy={lastY}
            r="4.5"
            fill={colorHex}
            initial={{ scale: 0.4, opacity: 0.5 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />

          <text
            x={padX}
            y={height - 2}
            fontSize="9"
            fill="#8f9bb1"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {formatTime(firstPoint.t)}
          </text>
          <text
            x={width / 2}
            y={height - 2}
            textAnchor="middle"
            fontSize="9"
            fill="#8f9bb1"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {formatTime(midPoint.t)}
          </text>
          <text
            x={width - padX}
            y={height - 2}
            textAnchor="end"
            fontSize="9"
            fill="#8f9bb1"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {formatTime(lastPoint.t)}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user }: { user: { name: string | null; image: string | null } }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name ?? "User"}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-green/20 text-green flex items-center justify-center text-[11px] font-bold shrink-0 ring-1 ring-green/20">
      {getInitials(user.name)}
    </div>
  );
}

// ── Comment Section ───────────────────────────────────────────────────────────

function CommentSection({ marketId, isLoggedIn }: { marketId: string; isLoggedIn: boolean }) {
  const [comments, setComments] = useState<MarketCommentData[]>([]);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const maxLen = 280;

  useEffect(() => {
    startTransition(async () => {
      const res = await getCommentsAction(marketId);
      if ("success" in res) setComments(res.comments);
      setLoaded(true);
    });
  }, [marketId]);

  const handlePost = () => {
    if (!body.trim() || isPending) return;
    setError(null);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: MarketCommentData = {
      id: optimisticId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      user: { id: "me", name: "You", image: null },
    };
    setComments((prev) => [optimistic, ...prev]);
    const draft = body;
    setBody("");
    startTransition(async () => {
      const res = await postCommentAction(marketId, draft);
      if ("error" in res) {
        setError(res.error);
        setComments((prev) => prev.filter((c) => c.id !== optimisticId));
        setBody(draft);
      } else {
        setComments((prev) =>
          prev.map((c) => (c.id === optimisticId ? res.comment : c))
        );
      }
    });
  };

  return (
    <div className="space-y-4 pt-6 border-t border-line">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Discussion</p>
        {comments.length > 0 && (
          <span className="text-[10px] font-mono text-fg-muted bg-bg-above px-1.5 py-0.5 rounded-md">
            {comments.length}
          </span>
        )}
      </div>

      {/* Input */}
      {isLoggedIn ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, maxLen))}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
              placeholder="Share your take on this market…"
              rows={2}
              className="w-full bg-bg-above/40 border border-line rounded-xl px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-muted resize-none focus:outline-none focus:border-green/40 transition-colors"
            />
            <span className={`absolute bottom-2.5 right-3 text-[10px] font-mono tabular-nums ${body.length > 250 ? "text-amber" : "text-fg-muted"}`}>
              {maxLen - body.length}
            </span>
          </div>
          {error && <p className="text-[11px] font-mono text-red">{error}</p>}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-fg-muted">Ctrl+Enter to post</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePost}
              disabled={isPending || !body.trim()}
              className="h-8 px-4 rounded-lg bg-green text-white text-[12px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {isPending ? "Posting…" : "Post"}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-4 text-center space-y-2">
          <p className="text-[12px] text-fg-muted">Join the discussion</p>
          <Link href="/login" className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-green text-white text-[12px] font-semibold hover:opacity-90 transition-opacity">
            Log in to comment
          </Link>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {!loaded && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-bg-above animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2.5 bg-bg-above animate-pulse rounded w-1/4" />
                  <div className="h-2 bg-bg-above animate-pulse rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {loaded && comments.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[12px] text-fg-muted text-center py-4"
            >
              No comments yet. Be the first to share your take! 🎯
            </motion.p>
          )}

          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3"
            >
              <Avatar user={c.user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold truncate">{c.user.name ?? "Anonymous"}</span>
                  <span className="text-[10px] font-mono text-fg-muted shrink-0">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-[12px] text-fg-secondary mt-0.5 leading-relaxed break-words">{c.body}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MarketDetailClient({
  market, outcomes, totalPoolCents, prizePoolCents, houseMarginBps,
  hasLiveOdds, walletBalanceCents, isLoggedIn, initialSelectedOutcome,
}: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(initialSelectedOutcome ?? null);
  const [stakeKES, setStakeKES] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [estimate, setEstimate] = useState<{ returnCents: number; profitCents: number; odds: number } | null>(null);
  const [placedBet, setPlacedBet] = useState<{ outcome: string; stakeCents: number; odds: number } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [liveOutcomes, setLiveOutcomes] = useState(outcomes);
  const [liveTotalPoolCents, setLiveTotalPoolCents] = useState(totalPoolCents);
  const [livePrizePoolCents, setLivePrizePoolCents] = useState(prizePoolCents);
  const [liveHouseMarginBps, setLiveHouseMarginBps] = useState(houseMarginBps);
  const [isLiveOddsOn, setIsLiveOddsOn] = useState(hasLiveOdds);
  const [nextRefreshIn, setNextRefreshIn] = useState(4);
  const anchorOddsRef = useRef(outcomes[0]?.decimalOdds ?? 1);
  const lastPoolRef = useRef(totalPoolCents);
  const momentumRef = useRef(0);
  const volatilityRef = useRef(0.002);
  const [chartPoints, setChartPoints] = useState<Array<{ t: number; value: number }>>(() => {
    const base = outcomes[0]?.decimalOdds ?? 1;
    return Array.from({ length: 24 }, (_, idx) => ({ t: Date.now() - (24 - idx) * 3000, value: base }));
  });

  const stakeCents = Math.round((parseFloat(stakeKES) || 0) * 100);
  const isValidStake = stakeCents >= 1000;
  const isCooldownActive = (cooldownSeconds ?? 0) > 0;
  const canBet = isLoggedIn && selectedOutcome && isValidStake && !isCooldownActive;
  const primaryOutcome = selectedOutcome ?? liveOutcomes[0]?.outcome ?? null;
  const primaryOutcomeData = liveOutcomes.find((o) => o.outcome === primaryOutcome) ?? liveOutcomes[0];
  const primaryColor = OUTCOME_COLORS[liveOutcomes.findIndex((o) => o.outcome === primaryOutcome)] ?? OUTCOME_COLORS[0];

  const chartDeltaPct = chartPoints.length > 1
    ? ((chartPoints[chartPoints.length - 1]!.value - chartPoints[0]!.value) / chartPoints[0]!.value) * 100
    : 0;

  useEffect(() => {
    const tracker = primaryOutcomeData?.decimalOdds ?? 1;
    anchorOddsRef.current = tracker;
    momentumRef.current = 0;
    volatilityRef.current = 0.002;
    setChartPoints(Array.from({ length: 24 }, (_, idx) => ({ t: Date.now() - (24 - idx) * 3000, value: tracker })));
  }, [primaryOutcome]);

  useEffect(() => {
    const motionTimer = setInterval(() => {
      setChartPoints((prev) => {
        const phase = Date.now() / 700;
        const wave = Math.sin(phase) * anchorOddsRef.current * volatilityRef.current;
        momentumRef.current *= 0.68;
        const animated = Math.max(1.01, anchorOddsRef.current + momentumRef.current + wave);
        const next = [...prev, { t: Date.now(), value: animated }];
        return next.slice(-28);
      });
    }, 1000);

    return () => clearInterval(motionTimer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const tick = async () => {
      const res = await getMarketOddsAction(market.id);
      if (!isMounted || !res.success) return;
      const snapshot = res.snapshot;
      setLiveOutcomes(snapshot.outcomes);
      setLiveTotalPoolCents(snapshot.totalPoolCents);
      setLivePrizePoolCents(snapshot.prizePoolCents);
      setLiveHouseMarginBps(snapshot.houseMarginBps);
      setIsLiveOddsOn(snapshot.hasLiveOdds);

      const trackedOutcome = primaryOutcome ?? snapshot.outcomes[0]?.outcome;
      const trackedPoint = snapshot.outcomes.find((o) => o.outcome === trackedOutcome) ?? snapshot.outcomes[0];
      if (!trackedPoint) return;

      const poolDelta = snapshot.totalPoolCents - lastPoolRef.current;
      const oddsDelta = trackedPoint.decimalOdds - anchorOddsRef.current;
      const poolWeight = Math.abs(poolDelta) / Math.max(snapshot.totalPoolCents, 1);
      const oddsWeight = Math.abs(oddsDelta) / Math.max(anchorOddsRef.current, 1);
      const activity = Math.min(1, poolWeight * 5 + oddsWeight * 6);

      lastPoolRef.current = snapshot.totalPoolCents;
      anchorOddsRef.current = trackedPoint.decimalOdds;
      momentumRef.current = oddsDelta * 0.5;
      volatilityRef.current = 0.0015 + activity * 0.006;
      setNextRefreshIn(5);

      setChartPoints((prev) => {
        const immediatePoint = Math.max(1.01, trackedPoint.decimalOdds + momentumRef.current * 0.25);
        const next = [...prev, { t: Date.now(), value: immediatePoint }];
        return next.slice(-28);
      });
    };

    const pollTimer = setInterval(() => {
      void tick();
    }, 5000);

    const countdown = setInterval(() => {
      setNextRefreshIn((prev) => (prev <= 1 ? 5 : prev - 1));
    }, 1000);

    void tick();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      clearInterval(countdown);
    };
  }, [market.id, primaryOutcome]);

  useEffect(() => {
    if (!isCooldownActive) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (!prev || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCooldownActive]);

  useEffect(() => {
    if (!selectedOutcome || stakeCents < 1000) {
      setEstimate(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const res = await estimatePayoutAction(market.id, selectedOutcome, stakeCents);
      if (cancelled || !res.success) return;
      setEstimate({
        returnCents: res.estimatedReturnCents!,
        profitCents: res.estimatedProfitCents!,
        odds: res.currentOdds!,
      });
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [market.id, selectedOutcome, stakeCents, liveOutcomes]);

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
        const oddsAtPlacement = typeof res.oddsAtPlacement === "number" ? res.oddsAtPlacement : 0;
        setPlacedBet({ outcome: selectedOutcome, stakeCents, odds: oddsAtPlacement });
        setSelectedOutcome(null);
        setStakeKES("");
        setEstimate(null);
        setShowPayoutModal(true);
      } else {
        const retryAfterSeconds = typeof res.retryAfterSeconds === "number" ? res.retryAfterSeconds : 0;
        if (retryAfterSeconds > 0) {
          setCooldownSeconds(retryAfterSeconds);
          showToast("error", `Bet locked for ${formatCooldown(retryAfterSeconds)} due to fraud cooldown.`);
          return;
        }
        const errorMessage = typeof res.error === "string" ? res.error : "Bet failed. Please try again.";
        showToast("error", errorMessage);
      }
    });
  };

  return (
    <>
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

      {/* ── Back ── */}
      <div className="flex items-center gap-2 text-[12px] font-mono text-fg-muted">
        <Link href="/dashboard/markets" className="hover:text-fg transition-colors">← Markets</Link>
        <span>/</span>
        <span className="text-fg-secondary truncate max-w-50">{market.title}</span>
      </div>

      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-fg-muted bg-bg-above px-2 py-0.5 rounded-md">
            {CATEGORY_EMOJI[market.category]} {market.category}
          </span>
          {isLiveOddsOn ? (
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{market.title}</h1>

        {/* Pool stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Pool", value: formatKES(liveTotalPoolCents, true), color: "text-fg" },
            { label: "Prize Pool", value: formatKES(livePrizePoolCents, true), color: "text-green" },
            { label: "House Edge", value: `${(liveHouseMarginBps / 100).toFixed(0)}%`, color: "text-amber" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-bg-above/30 p-3">
              <p className="text-[11px] font-mono text-fg-muted mb-1">{stat.label}</p>
              <p className={`text-[18px] font-mono font-bold ${stat.color} tabular-nums`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pool Distribution — Donut + Legend ── */}
      <LivePriceChart
        title={primaryOutcomeData ? `${primaryOutcomeData.outcome} live odds` : "Market live odds"}
        points={chartPoints}
        colorHex={primaryColor.hex}
        nextRefreshIn={nextRefreshIn}
        currentOdds={primaryOutcomeData?.decimalOdds ?? 1}
        deltaPct={chartDeltaPct}
      />

      <div className="rounded-2xl border border-line bg-bg-above/20 p-5">
        <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider mb-4">Pool Distribution</p>
        <div className="flex items-center gap-6 flex-wrap">
          <DonutChart outcomes={liveOutcomes} totalPoolCents={liveTotalPoolCents} />
          <div className="flex-1 min-w-[160px] space-y-3">
            {liveOutcomes.map((o, i) => {
              const color = OUTCOME_COLORS[i] ?? OUTCOME_COLORS[0];
              return (
                <div key={o.outcome} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${color.bg}`} />
                      <span className="text-[12px] font-medium truncate max-w-[120px]">{o.outcome}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[12px] font-mono font-bold tabular-nums ${color.text}`}>
                        {o.decimalOdds.toFixed(2)}x
                      </span>
                      <span className="text-[10px] font-mono text-fg-muted ml-1.5">{o.poolPercentage}%</span>
                    </div>
                  </div>
                  <OutcomeBar pct={o.poolPercentage} colorHex={color.hex} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Outcomes ── */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Pick Your Outcome</p>
          {liveOutcomes.map((o, i) => {
            const color = OUTCOME_COLORS[i] ?? OUTCOME_COLORS[0];
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
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "border-green" : "border-line-bright"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-green" />}
                      </div>
                      <p className="text-[14px] font-semibold truncate">{o.outcome}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <OutcomeBar pct={o.poolPercentage} colorHex={color.hex} />
                      <span className="text-[10px] font-mono text-fg-muted shrink-0">
                        {formatKES(o.poolCents, true)} · {o.poolPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[22px] font-mono font-bold tabular-nums leading-none ${
                      isSelected ? "text-green" : color.text
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

        {/* ── Bet Panel ── */}
        <div className="lg:col-span-2 space-y-4">

          {isLoggedIn && (
            <div className="rounded-xl border border-line bg-bg-above/20 p-3 flex items-center justify-between">
              <span className="text-[12px] font-mono text-fg-muted">Wallet</span>
              <span className="text-[14px] font-mono font-bold tabular-nums">{formatKES(walletBalanceCents)}</span>
            </div>
          )}

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

            <AnimatePresence>
              {estimate && selectedOutcome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-green/20 bg-green/5 p-3 space-y-1.5"
                >
                  <p className="text-[10px] font-mono text-green/70 uppercase tracking-wider">Estimated Payout (Live)</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono text-fg-muted">If {selectedOutcome} wins</span>
                    <span className="text-[16px] font-mono font-bold text-green tabular-nums">{formatKES(estimate.returnCents)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-fg-muted">Net profit</span>
                    <span className={`text-[12px] font-mono font-semibold tabular-nums ${estimate.profitCents >= 0 ? "text-green" : "text-red"}`}>
                      {estimate.profitCents >= 0 ? "+" : ""}{formatKES(estimate.profitCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-green/10 pt-1.5">
                    <span className="text-[11px] font-mono text-fg-muted">Current odds</span>
                    <span className="text-[12px] font-mono font-bold text-green">{estimate.odds.toFixed(2)}x</span>
                  </div>
                  <p className="text-[9px] font-mono text-fg-muted">Updates automatically as live odds and pool depth change.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {stakeKES && stakeCents < 1000 && <p className="text-[11px] font-mono text-red">Minimum bet is KES 10</p>}
            {stakeCents > walletBalanceCents && isLoggedIn && <p className="text-[11px] font-mono text-red">Insufficient wallet balance</p>}
            {isCooldownActive && <p className="text-[11px] font-mono text-amber">Betting cooldown: {formatCooldown(cooldownSeconds ?? 0)} remaining</p>}

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

          {/* Recent placed bet — compact card */}
          <AnimatePresence>
            {placedBet && !showPayoutModal && (
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

          {isLoggedIn && walletBalanceCents < 1000 && (
            <div className="rounded-xl border border-amber/20 bg-amber/5 p-3 text-[12px] font-mono text-amber">
              <p className="font-semibold mb-0.5">Low balance</p>
              <Link href="/dashboard/wallet" className="text-[11px] underline">Top up your wallet →</Link>
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
                      <span className="text-[10px] font-mono text-fg-muted">Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── How odds work ── */}
      <div className="rounded-xl border border-line bg-bg-above/10 p-4 space-y-2">
        <p className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">How odds work</p>
        <p className="text-[12px] text-fg-secondary leading-relaxed">
          StakePesa uses <strong>pari-mutuel pricing</strong> — odds are calculated from the actual pool of bets, not set by a bookmaker.
          The more people bet on an outcome, the lower its odds get. Early bettors on popular outcomes earn less;
          early bettors on surprise outcomes earn more. The platform takes a fixed 5% margin; the rest is shared among winners.
        </p>
      </div>

      {/* ── Comments ── */}
      <CommentSection marketId={market.id} isLoggedIn={isLoggedIn} />

    </div>

    {/* ══════════════════════════════════════════════════════════════
        PARI-MUTUEL REASSURANCE MODAL
       ══════════════════════════════════════════════════════════════ */}
    <AnimatePresence>
      {showPayoutModal && placedBet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPayoutModal(false)}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-green/20 bg-bg shadow-2xl shadow-green/10 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green/60 via-green to-green/60" />
            <div className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.15, damping: 12 }}
                  className="w-16 h-16 rounded-full bg-green/10 border-2 border-green/30 flex items-center justify-center mx-auto"
                >
                  <svg className="w-8 h-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </motion.div>
                <h2 className="text-xl font-bold">Bet Locked In!</h2>
                <p className="text-[13px] font-mono text-fg-muted">
                  {formatKES(placedBet.stakeCents)} on <strong className="text-fg">{placedBet.outcome}</strong> at {placedBet.odds.toFixed(2)}x
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bg-above/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <p className="text-[13px] font-semibold">Your payout keeps growing</p>
                </div>
                <p className="text-[12px] text-fg-secondary leading-relaxed">
                  Every new bet placed by others on <em>different outcomes</em> adds to the prize pool.
                  Your share is <strong className="text-green">locked in and guaranteed</strong> — it can only go <strong className="text-green">up</strong>, never down.
                </p>
                <div className="space-y-2 pt-1">
                  {[
                    { icon: "🔒", label: "Your bet is secured", desc: "Stake locked at current odds" },
                    { icon: "👥", label: "More people bet", desc: "The total prize pool grows" },
                    { icon: "💰", label: "Your payout increases", desc: "Winners split a bigger pot" },
                  ].map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.15 }}
                      className="flex items-center gap-3 rounded-lg bg-bg/60 px-3 py-2"
                    >
                      <span className="text-base shrink-0">{step.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold leading-tight">{step.label}</p>
                        <p className="text-[10px] text-fg-muted">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line bg-bg-above/20 p-3 text-center">
                  <p className="text-[10px] font-mono text-fg-muted uppercase">Current Pool</p>
                  <p className="text-[16px] font-mono font-bold tabular-nums mt-0.5">{formatKES(liveTotalPoolCents, true)}</p>
                </div>
                <div className="rounded-lg border border-green/20 bg-green/5 p-3 text-center">
                  <p className="text-[10px] font-mono text-green/70 uppercase">Your Odds</p>
                  <p className="text-[16px] font-mono font-bold text-green tabular-nums mt-0.5">{placedBet.odds.toFixed(2)}x</p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2 rounded-lg bg-green/5 border border-green/15 px-3 py-2"
              >
                <svg className="w-4 h-4 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[11px] text-green/90 font-medium leading-snug">
                  The earlier you bet, the better your position. Share this market to grow the pool!
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowPayoutModal(false)}
                className="w-full h-11 rounded-xl bg-green text-white text-[14px] font-bold hover:opacity-90 transition-opacity shadow-lg shadow-green/20"
              >
                Got it — Let&apos;s go! 🚀
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
