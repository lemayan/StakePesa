"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import rawMarketData from "@/data/markets.json";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AvatarStrip } from "@/components/ui/candidate-avatar";

/* ── Tiny inline SVG sparkline ── */
function MiniGraph({ data, color }: { data: number[]; color: string }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!data || data.length === 0 || !isMounted) return <div className="w-[40px] h-[20px]" />;
  const h = 20, w = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const line = pts.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polygon points={area} fill={color} opacity={0.15} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={2} fill={color} />
    </svg>
  );
}

/* ── Category icons (mini SVGs) ── */
const IconSports = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20" />
  </svg>
);
const IconPolitics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
  </svg>
);
const IconEconomics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconGeneric = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const CATEGORY_MAP: Record<string, { icon: React.ReactNode, accent: string }> = {
  sports: { icon: <IconSports />, accent: "#3b82f6" },
  politics: { icon: <IconPolitics />, accent: "#f59e0b" },
  economics: { icon: <IconEconomics />, accent: "#22c55e" },
  finance: { icon: <IconEconomics />, accent: "#10b981" },
  crypto: { icon: <IconGeneric />, accent: "#8b5cf6" },
  tech: { icon: <IconGeneric />, accent: "#ec4899" },
  climate: { icon: <IconGeneric />, accent: "#06b6d4" },
  health: { icon: <IconGeneric />, accent: "#ef4444" },
  culture: { icon: <IconGeneric />, accent: "#f43f5e" }
};

// Deterministic mini-graph generator
function generateMiniSpark(seedStr: string, current: number) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  const pseudoRandom = () => { const x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
  
  const spark = [];
  let val = current + (pseudoRandom() * 20 - 10);
  for(let i = 0; i < 7; i++) {
    spark.push(Math.round(val));
    val += (current - val) / (7 - i) + (pseudoRandom() * 6 - 3);
  }
  spark.push(current);
  return spark;
}

// ─── Image data types ─────────────────────────────────────

type ImageSource = "WIKIMEDIA" | "AI" | "MANUAL" | "API";
type EntityType = "PERSON" | "SPORTS_TEAM" | "COMPETITION" | "CRYPTO" | "GENERIC";

interface OptionImageData {
  entityType: EntityType;
  imageUrl: string | null;
  imageSource: ImageSource | null;
  imageVerified: boolean;
  imageShape: "circle" | "square" | null;
}

/** marketId → optionName → image data */
type ImagesMap = Record<string, Record<string, OptionImageData>>;

// ─── Hook: fetch image data from /api/market-images ──────

function useMarketImages(marketIds: string[]): ImagesMap {
  const [images, setImages] = useState<ImagesMap>({});

  useEffect(() => {
    if (marketIds.length === 0) return;
    const ids = marketIds.join(",");
    fetch(`/api/market-images?marketIds=${ids}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.images) setImages(data.images);
      })
      .catch(() => { /* silent fail — initials fallback will show */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketIds.join(",")]);

  return images;
}

function MarketQuickView({ market, imagesMap, categoryKey, parsedCategories, isLoggedIn }: any) {
  const related = parsedCategories
    .find((c: any) => c.name.toLowerCase() === categoryKey.toLowerCase())
    ?.markets.filter((m: any) => m.id !== market.id).slice(0, 3) || [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden bg-bg-above/20 dark:bg-bg-above/10 border-b border-line shadow-[inset_0px_5px_8px_rgb(0,0,0,0.02)]"
    >
      <div className="p-4 sm:p-6 md:px-8 max-w-5xl mx-auto space-y-6">
        
        {/* Top Details & Predict Box */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-[18px] sm:text-[20px] font-bold text-fg mb-4">
              {market.q}
            </h3>
            
            <div className="space-y-3">
              {market.options.map((opt: any) => {
                 const isYes = opt.name.toLowerCase() === "yes";
                 const isNo = opt.name.toLowerCase() === "no";
                 let color = "#3b82f6";
                 if (isYes) color = "#22c55e"; 
                 if (isNo) color = "#ef4444";
                 
                 const p = Math.round(opt.probability * 100);

                 return (
                   <button key={opt.name} className="w-full flex items-center justify-between p-3 rounded-xl border border-line hover:border-line-bright bg-bg hover:bg-bg-above transition-colors group">
                     <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[14px] font-medium text-fg-secondary group-hover:text-fg">{opt.name}</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-[14px] font-bold" style={{ color }}>{p}%</span>
                        <span className="text-[12px] font-mono text-fg-muted bg-bg-above px-2 py-1 rounded">{(1 / opt.probability).toFixed(2)}x</span>
                     </div>
                   </button>
                 )
              })}
            </div>
          </div>
          
          {/* Betting Interface */}
          <div className="bg-bg rounded-2xl border border-line p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[13px] font-mono text-fg-muted uppercase tracking-wide">Quick Bet</span>
                 <span className="text-[12px] font-mono text-green font-semibold shrink-0 bg-green/10 px-2 py-0.5 rounded-full border border-green/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green animate-pulse rounded-full" /> LIVE</span>
              </div>
              
              <div className="space-y-2">
                 <label className="text-[12px] text-fg-secondary">Amount (KES)</label>
                 <input type="number" disabled placeholder="Enter stake..." className="w-full h-11 px-4 rounded-lg bg-bg-above border border-line focus:ring-1 focus:ring-green disabled:opacity-50 font-mono text-[16px]" />
              </div>
            </div>

            <div className="mt-6 mb-2">
              <div className="flex justify-between text-[13px] text-fg-muted mb-1">
                <span>Potential Return</span>
                <span>--</span>
              </div>
              <div className="w-full h-px border-t border-dashed border-line mb-4" />
              
              {!isLoggedIn ? (
                 <Link href="/signup" className="w-full h-11 flex items-center justify-center rounded-lg bg-green text-white font-semibold text-[14px] hover:opacity-90 transition-opacity">
                   Sign up to bet
                 </Link>
              ) : (
                <Link href={`/dashboard/markets/${market.id}`} className="w-full h-11 flex items-center justify-center rounded-lg bg-fg text-bg font-semibold text-[14px] hover:opacity-90 transition-opacity">
                   Go to market details
                </Link>
              )}
            </div>

            {/* Overlays / Auth Gating */}
            {!isLoggedIn && (
              <div className="absolute inset-0 z-10 bg-bg/40 backdrop-blur-[2px] flex items-center justify-center">
                 <div className="bg-bg shadow-xl border border-line p-4 rounded-xl text-center mx-4">
                    <p className="text-[14px] text-fg font-medium mb-3">Join to start trading</p>
                    <Link href="/signup" className="h-9 px-5 bg-green flex items-center text-white text-[13px] font-semibold rounded-md hover:bg-green/90 transition-colors">
                      Claim Free Account
                    </Link>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Markets */}
        {related.length > 0 && (
          <div className="pt-6 border-t border-line">
            <h4 className="text-[12px] font-mono uppercase tracking-wider text-fg-muted flex items-center gap-2 mb-4">
              Similar Markets <span className="h-px flex-1 bg-line" />
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {related.map((rm: any) => (
                <div key={rm.id} className="p-3 rounded-xl border border-line hover:border-line-bright hover:bg-bg transition-colors flex flex-col gap-2 cursor-pointer">
                  <span className="text-[13px] font-medium leading-snug line-clamp-2">{rm.q}</span>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-[12px] font-mono font-bold text-green">{rm.yes}%</span>
                    <span className="text-[11px] font-mono text-fg-muted">Vol {rm.pot}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function LiveMarkets({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  let rowIndex = 0;

  // Process raw JSON into our UI groups dynamically
  const parsedCategories = useMemo(() => {
    // 1. Group by category
    const grouped = (rawMarketData.markets as any[]).reduce((acc: any, market: any) => {
      const catVal = (market.category || "other").toLowerCase();
      if (!acc[catVal]) acc[catVal] = [];
      
      // Calculate a "Yes" or dominant probability for the row
      const topOpt = market.options.reduce((prev: any, current: any) => (prev.probability > current.probability) ? prev : current);
      const yesPercent = Math.round(topOpt.probability * 100);
      
      // Generate deterministic sparkline
      const spark = generateMiniSpark(market.id + topOpt.name, yesPercent);
      
      // Mock pot/time ending for now
      const idHash = market.title.length;
      const potValues = ["12,500", "45,000", "2,000", "800", "6,000", "150,000", "8,500"];
      const timeValues = ["3h", "62d", "5d", "45m", "14d", "21d", "6mo"];
      
      acc[catVal].push({
        id: market.id,
        q: market.title,
        pot: potValues[idHash % potValues.length],
        yes: yesPercent,
        ends: timeValues[idHash % timeValues.length],
        spark,
        // Keep raw options for avatar rendering
        options: market.options as Array<{ name: string; probability: number }>,
      });
      return acc;
    }, {});

    // 2. Filter groups by URL parameter if present
    let finalGroups = Object.keys(grouped).map(catKey => {
      const meta = CATEGORY_MAP[catKey] || { icon: <IconGeneric />, accent: "#a855f7" };
      return {
        id: catKey,
        name: catKey.charAt(0).toUpperCase() + catKey.slice(1),
        icon: meta.icon,
        accent: meta.accent,
        markets: grouped[catKey]
      };
    });

    if (categoryFilter && categoryFilter !== "all") {
      finalGroups = finalGroups.filter(g => g.id === categoryFilter || g.name.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Sort heavily populated categories first
    return finalGroups.sort((a, b) => b.markets.length - a.markets.length);
  }, [categoryFilter]);

  // Collect all market IDs for image fetching
  const allMarketIds = useMemo(
    () => parsedCategories.flatMap((cat) => cat.markets.map((m: any) => m.id)),
    [parsedCategories]
  );

  // Fetch image data (non-blocking, falls back to initials)
  const imagesMap = useMarketImages(allMarketIds);

  if (parsedCategories.length === 0) {
    return (
      <section id="markets" className="border-t border-line py-20 flex flex-col items-center justify-center text-fg-muted">
        <IconGeneric />
        <p className="mt-4 text-[14px]">No live markets found for this category.</p>
      </section>
    );
  }

  return (
    <section id="markets" className="border-t border-line">
      <div className="h-10 sm:h-11 border-b border-line bg-bg-above/60 backdrop-blur-sm flex items-center justify-between px-4 sm:px-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
          </span>
          <span className="text-[12px] sm:text-[13px] font-mono text-fg-muted uppercase tracking-wider">
            {categoryFilter && categoryFilter !== "all" ? `${categoryFilter} Markets` : "Live markets"}
          </span>
        </div>
        <span className="text-[12px] sm:text-[13px] font-mono text-fg-muted">
          {parsedCategories.reduce((a, c) => a + c.markets.length, 0)} open
        </span>
      </div>

      {parsedCategories.map((cat) => (
        <div key={cat.name}>
          {/* category header */}
          <div
            className="h-10 sm:h-11 border-b border-line flex items-center px-4 sm:px-5 md:px-8 gap-2 sm:gap-3 relative overflow-hidden"
            style={{
              borderLeft: `3px solid ${cat.accent}`,
              background: `linear-gradient(90deg, ${cat.accent}12 0%, transparent 50%)`,
            }}
          >
            {/* accent icon */}
            <span
              className="flex items-center justify-center h-6 w-6 rounded-md"
              style={{ color: cat.accent, backgroundColor: `${cat.accent}18` }}
            >
              {cat.icon}
            </span>

            {/* category name */}
            <span
              className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.08em]"
              style={{ color: cat.accent }}
            >
              {cat.name}
            </span>

            {/* market count pill */}
            <span
              className="text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded-full"
              style={{ color: cat.accent, backgroundColor: `${cat.accent}15` }}
            >
              {cat.markets.length}
            </span>

            {/* subtle decorative line */}
            <span className="flex-1" />
            <span
              className="h-px flex-1 max-w-32 opacity-30"
              style={{ background: `linear-gradient(90deg, ${cat.accent}, transparent)` }}
            />
          </div>

          {/* market rows */}
          {cat.markets.map((m: any, j: number) => {
            const idx = rowIndex++;
            const color = m.yes >= 50 ? "#22c55e" : "#ef4444";

            // Build option list with image data for AvatarStrip
            const optionsWithImages = m.options.map((opt: { name: string }) => {
              const imgData = imagesMap[m.id]?.[opt.name];
              return {
                name: opt.name,
                entityType: (imgData?.entityType ?? null) as EntityType | null,
                imageUrl: imgData?.imageUrl ?? null,
                imageSource: imgData?.imageSource ?? null,
                imageVerified: imgData?.imageVerified ?? false,
                imageShape: (imgData?.imageShape ?? null) as "circle" | "square" | null,
              };
            });

            return (
              <motion.div
                key={m.id || j}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "50px" }}
                transition={{ delay: j * 0.05, duration: 0.4 }}
                className="flex flex-col"
              >
                {/* Desktop row */}
                <div 
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  className={`hidden sm:grid grid-cols-[1fr_auto_100px_100px_48px_72px] gap-0 px-5 md:px-8 h-14 items-center hover:bg-bg-hover transition-all duration-200 cursor-pointer group ${expandedId === m.id ? "bg-bg-hover/80 border-b border-line" : "border-b border-line"}`}
                >
                  
                  {/* question */}
                  <span className="text-[16px] truncate pr-4 group-hover:text-fg transition-colors flex items-center gap-2">
                    <svg className={`w-4 h-4 text-fg-muted shrink-0 transition-transform ${expandedId === m.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {m.q}
                  </span>
                  
                  {/* avatar strip */}
                  <span className="pr-3">
                    <AvatarStrip options={optionsWithImages} max={3} size={26} />
                  </span>

                  <span className="text-right font-mono text-[15px] text-fg-secondary">
                    KES {m.pot}
                  </span>
                  <span className="flex justify-center">
                    <span className="relative inline-flex items-center h-7 w-20 overflow-hidden bg-bg-above">
                      <motion.span
                        className={`absolute left-0 top-0 h-full ${
                          m.yes >= 50 ? "bg-green-dim" : "bg-red-dim"
                        }`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${m.yes}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: j * 0.05, ease: "easeOut" }}
                      />
                      <span className={`relative w-full text-center font-mono text-[14px] font-bold ${
                        m.yes >= 50 ? "text-green" : "text-red"
                      }`}>
                        {m.yes}%
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center justify-center">
                    <MiniGraph data={m.spark} color={color} />
                  </span>
                  <span className="text-right font-mono text-[14px] text-fg-muted flex items-center justify-end gap-2">
                     {m.ends}
                  </span>
                </div>

                {/* Mobile card row */}
                <div 
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  className={`sm:hidden flex flex-col gap-2 px-4 py-3 active:bg-bg-hover transition-all duration-200 cursor-pointer ${expandedId === m.id ? "bg-bg-hover/80 border-b border-line" : "border-b border-line"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {/* avatar strip on mobile */}
                      <AvatarStrip options={optionsWithImages} max={3} size={22} />
                      <span className="text-[14px] font-medium leading-snug flex gap-2">
                         <svg className={`w-3.5 h-3.5 mt-[2px] text-fg-muted shrink-0 transition-transform ${expandedId === m.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                         </svg>
                         {m.q}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <MiniGraph data={m.spark} color={color} />
                      <span className={`text-[14px] font-bold font-mono ${
                        m.yes >= 50 ? "text-green" : "text-red"
                      }`}>
                        {m.yes}%
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] font-mono text-fg-muted pl-6">
                    <span className="text-fg-secondary font-semibold">KES {m.pot}</span>
                    <span className="w-px h-3 bg-line" />
                    <span>{m.ends}</span>
                  </div>
                </div>

                {/* Inline Expansion Area */}
                <AnimatePresence>
                  {expandedId === m.id && (
                    <MarketQuickView
                      market={m}
                      imagesMap={imagesMap}
                      categoryKey={cat.name}
                      parsedCategories={parsedCategories}
                      isLoggedIn={isLoggedIn}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
