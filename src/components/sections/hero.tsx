"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { CandidateAvatar } from "@/components/ui/candidate-avatar";
import { useSearchParams } from "next/navigation";

/* ── Ticker Tape Data ── */
const tickerItems = [
  { q: "Safaricom M-Pesa processes over KES 1T in March 2026", vol: "4,840,000", odds: "62" },
  { q: "Kenya strikes new IMF funding deal by June 2026", vol: "9,600,000", odds: "55" },
  { q: "USD/KES exchange rate falls below KES 128 before April", vol: "6,800,000", odds: "42" },
  { q: "Gen Z protests return before end of Q1 2026", vol: "2,700,000", odds: "45" },
  { q: "Kenya wins gold at 2026 Commonwealth Games", vol: "2,100,000", odds: "83" },
  { q: "National dialogue committee formed before May 2026", vol: "2,300,000", odds: "38" },
  { q: "CBK cuts base lending rate in April MPC meeting", vol: "3,400,000", odds: "51" },
];

const pulseItems = [
  { title: "Ruto 2027", change: "+2.1%", volume: "KES 1.8M" },
  { title: "EPL Winner", change: "+1.4%", volume: "KES 2.4M" },
  { title: "BTC ATH", change: "-0.9%", volume: "KES 1.2M" },
  { title: "Cost of Living", change: "+0.6%", volume: "KES 980K" },
  { title: "Harambee AFCON", change: "+1.2%", volume: "KES 760K" },
];

/* ── Rich Multi-Outcome Custom Markets ── */
export type Outcome = {
  id: string;
  name: string;
  imageUrl: string | null;
  odds: number;
  payout: string;
};

export type TrendingMarket = {
  id: string;
  title: string;
  category: string;
  volumeKES: string;
  outcomes: Outcome[];
};

export type SiteConfig = {
  adText: string | null;
  adUrl: string | null;
  trendingMessage: string | null;
};

/* ── Generated Line History Helper ── */
function generateDeterministicHistory(seedStr: string, currentOdds: number, points = 60) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed += seedStr.charCodeAt(i);
  }
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  const start = Math.max(2, Math.min(98, currentOdds + (pseudoRandom() * 20 - 10)));
  const res = [start];
  let curr = start;
  for (let i = 1; i < points - 1; i++) {
    const trend = (currentOdds - start) / points;
    curr += trend + (pseudoRandom() * 8 - 4);
    curr = Math.max(2, Math.min(98, curr));
    res.push(curr);
  }
  res.push(currentOdds);
  return res;
}

const COLOR_PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444"];

/* ── Real SVG Chart Component (Matching Kalshi style) ── */
function MultiLineChart({ outcomes, activeHover, setActiveHover }: { outcomes: (Outcome & { color: string, history: number[] })[]; activeHover: number | null; setActiveHover: (idx: number | null) => void }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const width = 460;
  const height = 180;
  const paddingX = 10;
  const paddingY = 20;

  // X axis labels
  const months = ["May", "Jul", "Oct", "Dec", "Mar"];
  
  // Create precise SVG paths for each outcome
  const viewBox = `0 0 ${width} ${height}`;
  
  return (
    <div 
      className="relative w-full h-[100px] sm:h-[220px] md:h-[300px] flex flex-col justify-end"
      onMouseLeave={() => setActiveHover(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, (x - paddingX) / (width - paddingX * 2)));
        const pointIndex = Math.floor(percentage * 59); // 60 data points length
        setActiveHover(pointIndex);
      }}
    >
      {/* Y-axis grid lines (dashed) */}
      <div className="absolute inset-0 right-[40px] pointer-events-none flex flex-col justify-between py-[10px] sm:py-[20px] pb-[20px] sm:pb-[40px]">
        {[40, 30, 20, 10, 0].map((val, i) => (
          <div key={i} className="relative w-full border-t border-line border-dashed opacity-20 h-0">
            <span className="absolute -right-[36px] -top-[8px] text-[10px] font-mono text-fg-muted hidden sm:block">{val}%</span>
          </div>
        ))}
      </div>

      {isMounted && (
        <svg width="100%" height="100%" viewBox={viewBox} className="overflow-visible" preserveAspectRatio="none">
          {outcomes.map((outcome, oIdx) => {
            const pts = outcome.history.map((val, i) => {
              const x = paddingX + (i / (outcome.history.length - 1)) * (width - paddingX * 2);
              // Map 0-50% to the full height (since max odds usually around 50% in multi-way, or scale dynamically)
              const maxVal = Math.max(...outcomes.flatMap(o => o.history));
              const yMaxScale = maxVal > 50 ? 100 : 50; 
              const y = height - paddingY - (val / yMaxScale) * (height - paddingY * 2);
              return `${x},${y}`;
            });

            return (
              <g key={outcome.id}>
                {/* Main Line */}
                <polyline 
                  points={pts.join(" ")} 
                  fill="none" 
                  stroke={outcome.color} 
                  strokeWidth={2} 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  opacity={activeHover !== null ? 0.3 : 1}
                />
                {/* Highlight exact hover point if active */}
                {activeHover !== null && (
                  <circle
                    cx={pts[activeHover].split(",")[0]}
                    cy={pts[activeHover].split(",")[1]}
                    r={4}
                    fill={outcome.color}
                    stroke="#000"
                    strokeWidth={2}
                  />
                )}
                {/* End dot if not hovering */}
                {activeHover === null && (
                  <circle
                    cx={pts[pts.length - 1].split(",")[0]}
                    cy={pts[pts.length - 1].split(",")[1]}
                    r={3.5}
                    fill={outcome.color}
                  />
                )}
              </g>
            );
          })}

          {/* Vertical hover line indicator */}
          {activeHover !== null && (
            <line
              x1={paddingX + (activeHover / 59) * (width - paddingX * 2)}
              y1={10}
              x2={paddingX + (activeHover / 59) * (width - paddingX * 2)}
              y2={height - 20}
              className="stroke-fg-muted"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          )}
        </svg>
      )}

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-[10px] right-[40px] hidden sm:flex justify-between text-[11px] font-mono text-fg-muted">
        {months.map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

/* ── Main Hero Card ── */
interface HeroProps {
  initialTrendingMarkets: TrendingMarket[];
  siteConfig: SiteConfig | null;
  globalStats: { tradersCount: number, totalVolumeMil: number };
}

export function Hero({ initialTrendingMarkets, siteConfig, globalStats }: HeroProps) {
  const [marketIdx, setMarketIdx] = useState(0);
  const [activeHover, setActiveHover] = useState<number | null>(null);

  const trendingMarkets = React.useMemo(() => {
    if (!initialTrendingMarkets || initialTrendingMarkets.length === 0) return [];
    
    // Map in standard UI elements
    return initialTrendingMarkets.map((m) => {
      return {
        ...m,
        outcomes: m.outcomes.map((o, oIdx) => ({
          ...o,
          color: COLOR_PALETTE[oIdx % COLOR_PALETTE.length],
          history: generateDeterministicHistory(o.id, o.odds)
        }))
      }
    });
  }, [initialTrendingMarkets]);

  const market = trendingMarkets[marketIdx % trendingMarkets.length];

  const nextMarket = () => {
    if (trendingMarkets.length > 0) setMarketIdx((i) => (i + 1) % trendingMarkets.length);
  };
  const prevMarket = () => {
    if (trendingMarkets.length > 0) setMarketIdx((i) => (i - 1 + trendingMarkets.length) % trendingMarkets.length);
  };

  // Auto-slide effect
  useEffect(() => {
    if (activeHover !== null || trendingMarkets.length === 0) return;
    
    const interval = setInterval(() => {
      setMarketIdx((i) => (i + 1) % trendingMarkets.length);
    }, 4000); // 4 seconds per slide

    return () => clearInterval(interval);
  }, [activeHover, trendingMarkets.length]);

  if (!market) return null; // Safe fallback if no markets match

  return (
    <section className="relative">
      {/* ── TICKER TAPE ── */}
      <div className="border-b border-line overflow-hidden h-9 sm:h-10 flex items-center bg-bg-above/60 backdrop-blur-sm">
        <div className="animate-ticker flex items-center gap-6 sm:gap-8 whitespace-nowrap text-[12px] sm:text-[14px] font-mono">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-livepulse" />
              <span className="text-fg-secondary truncate max-w-[200px] sm:max-w-[280px]">{t.q}</span>
              <span className="text-green font-semibold">KES {t.vol}</span>
              <span className="text-fg-muted">{t.odds}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── SPLIT LAYOUT ── */}
      <div className="grid lg:grid-cols-[1fr_1fr] min-h-[auto] lg:min-h-[760px]">
        
        {/* LEFT — Headline + CTA */}
        <div className="relative px-4 py-8 sm:p-8 md:p-12 lg:p-16 pb-4 sm:pb-8 flex flex-col justify-center lg:justify-start lg:pt-16 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-[0.03]" />

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative text-[clamp(2rem,7vw,5rem)] font-bold leading-[1.08] tracking-tight"
          >
            Wekelea doo.<br/>
            <span className="text-green">Ganji ndo inabonga.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative text-[15px] sm:text-[18px] text-fg-secondary mt-4 sm:mt-5 max-w-lg leading-relaxed"
          >
            Weka bet yako kwa events za ukweli Kenya. Elections, economics, sports na culture. Hakuna ujanja, ni transparent na peer-to-peer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 sm:mt-9"
          >
            <Link
              href="/signup"
              className="h-11 sm:h-12 px-7 text-[15px] sm:text-[16px] font-semibold bg-green text-white rounded flex items-center justify-center hover:opacity-90 transition-opacity duration-200"
            >
              Start Trading Now
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="relative flex justify-center sm:justify-start items-center gap-8 sm:gap-6 mt-8 sm:mt-12 font-mono text-fg-muted text-center sm:text-left"
          >
            <div>
              <AnimatedCounter target={globalStats.tradersCount} prefix="" suffix="+" className="text-fg font-bold text-[22px] sm:text-[28px] block tabular-nums" />
              <span className="text-[11px] sm:text-[13px] mt-1 block uppercase tracking-wider">traders</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-line" />
            <div>
              <AnimatedCounter target={globalStats.totalVolumeMil} prefix="KES " suffix="M" decimals={1} className="text-fg font-bold text-[22px] sm:text-[28px] block tabular-nums" />
              <span className="text-[11px] sm:text-[13px] mt-1 block uppercase tracking-wider">volume</span>
            </div>
          </motion.div>
        </div>

        {/* RIGHT — Theme-Adaptive Kalshi Style Market Card component */}
        <div className="flex items-center lg:items-start justify-center p-3 sm:p-4 lg:p-6 lg:pt-16 perspective-1000">
          {/* Card Container */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[900px] md:min-h-[460px] bg-bg/80 backdrop-blur-xl border border-line rounded-[16px] sm:rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-4 sm:p-6 lg:p-8 relative overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
              <h2 className="text-[18px] sm:text-[22px] lg:text-[26px] font-bold leading-snug sm:leading-tight pr-0 sm:pr-4 text-fg line-clamp-3 sm:line-clamp-none">
                {market.title}
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 self-start sm:self-auto bg-line/20 sm:bg-transparent rounded-full p-1 sm:p-0 pointer-events-auto">
                <button onClick={prevMarket} className="w-8 h-8 rounded-full bg-bg shadow-sm sm:shadow-none sm:bg-fg/5 hover:bg-fg/10 flex items-center justify-center transition sm:border border-line">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-fg-secondary">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <span className="text-[12px] sm:text-[14px] font-medium text-fg-muted w-10 sm:w-12 text-center pointer-events-none tracking-wide">
                  {marketIdx + 1}<span className="opacity-50">/</span>{trendingMarkets.length}
                </span>
                <button onClick={nextMarket} className="w-8 h-8 rounded-full bg-bg shadow-sm sm:shadow-none sm:bg-fg/5 hover:bg-fg/10 flex items-center justify-center transition sm:border border-line">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-fg-secondary">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Split Content Body */}
            <div className="flex flex-col md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] gap-4 lg:gap-8 border-t border-line/50 pt-4 lg:pt-6">
              
              {/* Left Col: Outcomes & Volume */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-fg-muted mb-2 sm:mb-3 px-1 uppercase tracking-wider">
                    <span>Market</span>
                    <span className="flex-1 text-center pl-2 sm:pl-4">Pays out</span>
                    <span>Odds</span>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-3">
                    {market.outcomes.map((outcome, idx) => (
                      <div 
                        key={outcome.id} 
                        className="flex items-center justify-between group cursor-pointer"
                        onMouseEnter={() => setActiveHover(59)} // Focus end of chart
                        onMouseLeave={() => setActiveHover(null)}
                      >
                        {/* Avatar + Name */}
                        <div className="flex items-center gap-3 min-w-[120px]">
                          {outcome.imageUrl ? (
                            <img src={outcome.imageUrl} alt={outcome.name} className="shrink-0 rounded-md object-cover shadow-sm sm:shadow-lg sm:w-[32px] sm:h-[32px] w-[28px] h-[28px]" />
                          ) : (
                            <CandidateAvatar name={outcome.name} size={28} className="shrink-0 shadow-sm sm:shadow-lg sm:w-[32px] sm:h-[32px] w-[28px] h-[28px]" />
                          )}
                          {/* Hide text label for Yes/No — the chip already shows it */}
                          {(() => {
                            const lower = outcome.name.trim().toLowerCase();
                            const isYes = lower === "yes";
                            const isNo = lower === "no";
                            if (isYes || isNo) return null;
                            return (
                              <div className="flex flex-col items-start pt-1">
                                <span className="text-[15px] font-medium text-fg-secondary truncate max-w-[120px] group-hover:text-fg transition">
                                  {outcome.name}
                                </span>
                                <div className="h-[2px] w-6 mt-0.5 rounded-full" style={{ backgroundColor: outcome.color }} />
                              </div>
                            );
                          })()}

                        </div>

                        {/* Payout */}
                        <span className="text-[13px] font-mono font-medium text-fg-secondary flex-1 text-right pr-4 sm:pr-8">
                          {outcome.payout}
                        </span>

                        {/* Odds Pill */}
                        <div 
                          className="px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-[999px] border flex items-center justify-center transition-colors dark:bg-transparent"
                          style={{
                            borderColor: outcome.color,
                            backgroundColor: activeHover !== null && activeHover === idx ? `${outcome.color}15` : undefined
                          }}
                        >
                          <span className="text-[14px] font-bold text-fg">
                            {activeHover !== null ? outcome.history[activeHover].toFixed(0) : outcome.odds}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  <div className="flex items-center justify-between text-[12px] font-medium text-fg-secondary mb-3">
                    <p>KES {market.volumeKES} vol</p>
                    <p>{siteConfig?.trendingMessage || "Trending automatically"}</p>
                  </div>

                  <div className="w-full h-px border-t border-dashed border-line/50 mb-3" />

                  <p className="text-[13px] font-normal text-fg-muted leading-snug line-clamp-3">
                    <span className="text-fg-secondary font-bold">Category &bull; </span>
                    {market.category}
                  </p>
                </div>
              </div>

              {/* Right Col: Interactive Chart (Hidden on Mobile) */}
              <div className="relative hidden md:block pt-0 sm:pt-2">
                {/* Legend top row */}
                <div className="absolute top-0 left-0 right-0 hidden sm:flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 z-10 px-2">
                  {market.outcomes.map(o => (
                    <div key={o.id} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
                      <span className="text-[12px] font-medium text-fg-muted">{o.name.split(" ")[0]}</span>
                      <span className="text-[12px] font-bold text-fg-secondary">{o.odds}%</span>
                    </div>
                  ))}
                </div>

                <MultiLineChart outcomes={market.outcomes} activeHover={activeHover} setActiveHover={setActiveHover} />
              </div>

            </div>

          </motion.div>
        </div>

        {/* Bottom utility strip for now (easy ad-slot replacement later) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.95 }}
          className="hidden lg:grid lg:col-span-2 mt-2 mb-6 mx-8 grid-cols-[auto_1fr_auto] items-center gap-4 border border-line bg-bg-above/70 backdrop-blur-sm rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-fg-muted">Live Pulse</span>
          </div>

          <div className="overflow-hidden">
            <div className="animate-ticker flex items-center gap-5 whitespace-nowrap text-[12px] font-mono">
              {[...pulseItems, ...pulseItems].map((item, index) => (
                <span key={`${item.title}-${index}`} className="flex items-center gap-2">
                  <span className="text-fg-secondary">{item.title}</span>
                  <span className={item.change.startsWith("-") ? "text-red" : "text-green"}>{item.change}</span>
                  <span className="text-fg-muted">{item.volume}</span>
                </span>
              ))}
            </div>
          </div>

          {siteConfig?.adText && (
            siteConfig.adUrl ? (
              <a href={siteConfig.adUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-fg bg-bg border border-line rounded-md px-3 py-1.5 shrink-0 hover:bg-bg-above transition uppercase">
                {siteConfig.adText}
              </a>
            ) : (
              <span className="text-[11px] font-mono text-fg bg-bg border border-line rounded-md px-3 py-1.5 shrink-0 uppercase">
                {siteConfig.adText}
              </span>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
