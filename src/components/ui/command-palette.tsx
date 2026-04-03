"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ── Searchable items (markets, pages, actions) ── */
interface SearchItem {
  type: "market" | "page" | "action";
  title: string;
  subtitle?: string;
  href?: string;
  icon?: string;
  odds?: number;
  hot?: boolean;
}

const searchItems: SearchItem[] = [
  // Markets
  { type: "market", title: "Arsenal wins the Premier League 2025", subtitle: "Sports · 148 players", href: "/dashboard/markets/1", odds: 62, hot: true },
  { type: "market", title: "BTC above $100k by end of 2025", subtitle: "Finance · 312 players", href: "/dashboard/markets/2", odds: 38, hot: true },
  { type: "market", title: "No junk food for 30 days challenge", subtitle: "Personal · 8 players", href: "/dashboard/markets/3", odds: 71 },
  { type: "market", title: "Ruto signs Finance Bill 2025", subtitle: "Politics · 567 players", href: "/dashboard/markets/4", odds: 44, hot: true },
  { type: "market", title: "KES/USD reaches 125 by Q3", subtitle: "Finance · 89 players", href: "/dashboard/markets/5", odds: 23 },
  { type: "market", title: "Complete 100 pushups daily for a week", subtitle: "Personal · 5 players", href: "/dashboard/markets/6", odds: 82 },
  { type: "market", title: "Man City vs Real Madrid UCL winner", subtitle: "Sports · 234 players", href: "/dashboard/markets/7", odds: 56, hot: true },
  { type: "market", title: "Drake drops new album before July", subtitle: "Entertainment · 178 players", href: "/dashboard/markets/8", odds: 67 },
  // Pages
  { type: "page", title: "Overview", subtitle: "Dashboard home", href: "/dashboard", icon: "grid" },
  { type: "page", title: "Markets", subtitle: "Browse all markets", href: "/dashboard/markets", icon: "chart" },
  { type: "page", title: "Create Bet", subtitle: "Create a new market", href: "/dashboard/markets/create", icon: "plus" },
  { type: "page", title: "Wallet", subtitle: "Deposits & withdrawals", href: "/dashboard/wallet", icon: "wallet" },
  { type: "page", title: "Leaderboard", subtitle: "Top performers", href: "/dashboard/leaderboard", icon: "trophy" },
  { type: "page", title: "Activity", subtitle: "Transaction history", href: "/dashboard/activity", icon: "clock" },
  { type: "page", title: "Profile", subtitle: "Your account settings", href: "/dashboard/profile", icon: "user" },
  { type: "page", title: "Invite", subtitle: "Refer friends & earn", href: "/dashboard/invite", icon: "users" },
  { type: "page", title: "Notifications", subtitle: "Updates & alerts", href: "/dashboard/notifications", icon: "bell" },
  // Actions
  { type: "action", title: "Deposit Funds", subtitle: "Add money to your wallet", href: "/dashboard/wallet", icon: "deposit" },
  { type: "action", title: "Withdraw Funds", subtitle: "Cash out to M-Pesa or bank", href: "/dashboard/wallet", icon: "withdraw" },
];

const typeLabels: Record<string, string> = { market: "Markets", page: "Pages", action: "Actions" };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.length === 0
    ? searchItems.slice(0, 8)
    : searchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(query.toLowerCase())
      );

  // Group by type
  const grouped = filtered.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const flatItems = Object.values(grouped).flat();

  const navigate = useCallback(
    (item: SearchItem) => {
      if (item.href) router.push(item.href);
      setOpen(false);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIdx]) {
      navigate(flatItems[selectedIdx]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-[90vw] max-w-[560px] bg-bg border border-line rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-line">
              <svg className="w-4 h-4 text-fg-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search markets, pages, actions..."
                className="flex-1 h-full text-[14px] bg-transparent outline-none placeholder:text-fg-muted"
              />
              <kbd className="hidden sm:inline text-[10px] font-mono text-fg-muted bg-bg-above px-1.5 py-0.5 rounded border border-line">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {flatItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-[14px] text-fg-muted">
                  No results for &quot;{query}&quot;
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => {
                  const startIdx = flatItems.indexOf(items[0]);
                  return (
                    <div key={type}>
                      <div className="px-4 py-1.5 text-[10px] font-mono text-fg-muted uppercase tracking-wider">
                        {typeLabels[type]}
                      </div>
                      {items.map((item, i) => {
                        const globalIdx = startIdx + i;
                        const isSelected = globalIdx === selectedIdx;
                        return (
                          <button
                            key={`${item.title}-${i}`}
                            onClick={() => navigate(item)}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                              isSelected ? "bg-green/8" : "hover:bg-bg-above"
                            }`}
                          >
                            {/* Icon */}
                            {item.type === "market" ? (
                              <div className="w-8 h-8 rounded bg-bg-above border border-line flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-bg-above border border-line flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={
                                    item.icon === "grid" ? "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" :
                                    item.icon === "plus" ? "M12 4.5v15m7.5-7.5h-15" :
                                    item.icon === "wallet" ? "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" :
                                    item.icon === "trophy" ? "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0013.125 10.875h-2.25A3.375 3.375 0 007.5 14.25v4.5" :
                                    item.icon === "clock" ? "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" :
                                    item.icon === "user" ? "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" :
                                    item.icon === "bell" ? "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" :
                                    "M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                                  } />
                                </svg>
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[13px] font-medium truncate ${isSelected ? "text-green" : ""}`}>
                                  {item.title}
                                </span>
                                {item.hot && (
                                  <span className="text-[9px] font-mono text-amber font-bold bg-amber/10 px-1 py-0.5 rounded">HOT</span>
                                )}
                              </div>
                              {item.subtitle && (
                                <span className="text-[11px] text-fg-muted">{item.subtitle}</span>
                              )}
                            </div>

                            {/* Odds for markets */}
                            {item.odds !== undefined && (
                              <span className={`text-[13px] font-mono font-bold shrink-0 ${item.odds >= 50 ? "text-green" : "text-red"}`}>
                                {item.odds}%
                              </span>
                            )}

                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-4 h-9 border-t border-line text-[10px] font-mono text-fg-muted">
              <span className="flex items-center gap-1">
                <kbd className="bg-bg-above px-1 py-0.5 rounded border border-line">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-bg-above px-1 py-0.5 rounded border border-line">Enter</kbd> Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-bg-above px-1 py-0.5 rounded border border-line">Esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
