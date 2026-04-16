"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

/* ── SVG Icons for Categories ── */
const IconAll = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconPolitics = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
const IconSports = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
const IconEconomics = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const IconCrypto = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconClimate = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconTech = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const IconHealth = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const IconCulture = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconFinance = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

/* ── Market category rail data ── */
const CATEGORIES = [
  { label: "All Markets", icon: <IconAll />, id: "all" },
  { label: "Politics", icon: <IconPolitics />, id: "politics" },
  { label: "Sports", icon: <IconSports />, id: "sports" },
  { label: "Economics", icon: <IconEconomics />, id: "economics" },
  { label: "Crypto", icon: <IconCrypto />, id: "crypto" },
  { label: "Climate", icon: <IconClimate />, id: "climate" },
  { label: "Tech", icon: <IconTech />, id: "tech" },
  { label: "Health", icon: <IconHealth />, id: "health" },
  { label: "Culture", icon: <IconCulture />, id: "culture" },
  { label: "Finance", icon: <IconFinance />, id: "finance" },
];

/* ── Animated live dot ── */
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
    </span>
  );
}

/* ── Search field ── */
function SearchBar() {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={`relative hidden lg:flex items-center gap-2 h-9 px-3 rounded-full border transition-all duration-300 ${
        focused
          ? "border-green/60 bg-green/5 shadow-[0_0_0_3px_rgba(34,197,94,0.12)] dark:border-green/50 dark:bg-green/10"
          : "border-line bg-bg-above hover:border-line-bright dark:border-white/20 dark:bg-white/5 dark:hover:border-white/30"
      }`}
      style={{ width: focused ? 240 : 196 }}
    >
      <svg className="w-3.5 h-3.5 text-fg-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Search markets…"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 bg-transparent text-[13px] text-fg placeholder:text-fg-muted outline-none"
      />
      {focused && (
        <kbd className="text-[10px] font-mono text-fg-muted border border-line rounded px-1 py-0.5 hidden sm:block">⌘K</kbd>
      )}
    </div>
  );
}

/* ── Nav link with animated underline ── */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group relative flex items-center h-full px-1 text-[14px] font-medium text-fg-secondary hover:text-fg transition-colors duration-200"
    >
      {children}
      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-green scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </a>
  );
}

/* ── Category chip ── */
function CategoryChip({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-medium transition-all duration-200 select-none ${
        isActive
          ? "bg-green text-white shadow-[0_0_12px_rgba(34,197,94,0.4)]"
          : "text-fg-secondary hover:text-fg hover:bg-bg-above border border-line hover:border-line-bright dark:hover:bg-white/5 dark:border-white/10 dark:hover:border-white/20"
      }`}
    >
      <span className="text-[14px] leading-none opacity-80">{icon}</span>
      {label}
    </button>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "all";
  
  const [scrolled, setScrolled] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  /* Shrink on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ══════════════════════════════ PRIMARY NAV ROW ══════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-bg/90 backdrop-blur-xl shadow-[0_1px_0_0_var(--c-line),0_8px_32px_-8px_rgba(0,0,0,0.24)]"
            : "bg-bg/80 backdrop-blur-md border-b border-line"
        }`}
      >
        {/* — Top bar — */}
        <div className="h-14 sm:h-[52px] flex items-center gap-4 px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Logo iconSize={34} textSize="text-[19px] sm:text-[20px]" />
          </Link>

          {/* Divider */}
          <div className="hidden sm:block h-5 w-px bg-line flex-shrink-0" />

          {/* Nav links */}
          <nav className="hidden sm:flex items-stretch gap-5 h-full">
            <NavLink href="#markets">Markets</NavLink>
            <NavLink href="#how">How it works</NavLink>
            <div className="flex items-center gap-1.5 text-[14px] font-medium text-fg-secondary">
              <LiveDot />
              <span className="text-green font-semibold">Live</span>
              <span className="text-[11px] font-mono bg-green/10 text-green rounded px-1.5 py-0.5">14</span>
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <SearchBar />
            <ThemeToggle />

            {/* Create Bet Button (Desktop) */}
            <Link 
              href="/dashboard/create" 
              className="hidden sm:flex h-9 px-4 mr-2 text-[13px] font-bold bg-bg-above border border-line hover:border-green hover:text-green text-fg transition-colors duration-200 rounded-full items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Bet
            </Link>

            {/* Desktop auth */}
            <div className="hidden sm:flex items-center gap-2">
              {!hasMounted || status === "loading" ? (
                <div className="w-16 h-8 bg-bg-above animate-pulse rounded-full" />
              ) : session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="h-9 px-5 text-[13px] font-semibold bg-green text-white rounded-full flex items-center gap-1.5 hover:opacity-90 hover:shadow-[0_0_16px_rgba(34,197,94,0.4)] transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="h-9 px-4 text-[13px] text-fg-muted hover:text-fg transition-colors duration-200 border border-line rounded-full hover:border-line-bright"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex justify-center h-9 px-4 text-[13px] font-medium items-center text-fg-secondary hover:text-fg transition-colors duration-200"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="h-9 px-5 text-[13px] font-semibold bg-green text-white rounded-full flex items-center hover:opacity-90 hover:shadow-[0_0_16px_rgba(34,197,94,0.35)] transition-all duration-200"
                  >
                    Get started →
                  </Link>
                </>
              )}
            </div>

            {/* Mobile CTA */}
            <div className="flex sm:hidden items-center gap-2">
              {hasMounted && status !== "loading" && !session && (
                <Link href="/signup" className="h-8 px-4 text-[12px] font-semibold bg-green text-white rounded-full flex items-center">
                  Start →
                </Link>
              )}
              {hasMounted && status !== "loading" && session && (
                <Link href="/dashboard" className="h-8 px-4 text-[12px] font-semibold bg-green text-white rounded-full flex items-center">
                  Dashboard
                </Link>
              )}
            </div>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full border border-line hover:border-line-bright transition-colors"
              aria-label="Menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* ══════════ CATEGORY RAIL ══════════ */}
        <div className="border-t border-line relative">
          {/* Left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg to-transparent z-10 pointer-events-none" />
          {/* Right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg to-transparent z-10 pointer-events-none" />

          <div
            ref={railRef}
            className="flex items-center gap-1.5 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Trending label */}
            <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 mr-1 border-r border-line">
              <svg className="w-3 h-3 text-amber" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] font-semibold text-amber uppercase tracking-widest whitespace-nowrap">Hot</span>
            </div>

            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.label}
                icon={cat.icon}
                isActive={currentCategory === cat.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (cat.id === "all") {
                    params.delete("category");
                  } else {
                    params.set("category", cat.id);
                  }
                  // Let the Hero section jump or just update the URL smoothly
                  router.push(`/?${params.toString()}#hero`, { scroll: true });
                }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════ MOBILE MENU ══════════════════════════════ */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="sm:hidden sticky top-[92px] z-40 overflow-hidden border-b border-line bg-bg/96 backdrop-blur-xl"
          >
            <div className="flex flex-col px-4 py-3 gap-1">
              {/* Live badge */}
              <div className="flex items-center gap-2 px-3 py-2">
                <LiveDot />
                <span className="text-[13px] font-semibold text-green">14 Active Markets</span>
              </div>
              <div className="h-px bg-line my-1" />
              <a href="#markets" onClick={() => setMenuOpen(false)} className="h-11 flex items-center px-3 rounded-xl text-[15px] text-fg-secondary hover:bg-bg-above hover:text-fg transition-colors">
                Markets
              </a>
              <a href="#how" onClick={() => setMenuOpen(false)} className="h-11 flex items-center px-3 rounded-xl text-[15px] text-fg-secondary hover:bg-bg-above hover:text-fg transition-colors">
                How it works
              </a>
              <Link href="/dashboard/create" onClick={() => setMenuOpen(false)} className="h-11 flex items-center px-3 gap-2 rounded-xl text-[15px] font-semibold text-green hover:bg-green/10 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create Bet
              </Link>
              <div className="h-px bg-line my-1" />
              {hasMounted && status !== "loading" && !session && (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="h-11 flex items-center px-3 rounded-xl text-[15px] text-fg-secondary hover:bg-bg-above hover:text-fg transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="h-11 flex items-center justify-center px-3 rounded-xl text-[15px] font-semibold bg-green text-white shadow-[0_0_16px_rgba(34,197,94,0.3)]">
                    Get started →
                  </Link>
                </>
              )}
              {hasMounted && status !== "loading" && session && (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="h-11 flex items-center justify-center px-3 rounded-xl text-[15px] font-semibold bg-green text-white shadow-[0_0_16px_rgba(34,197,94,0.3)]">
                    Dashboard
                  </Link>
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="h-11 flex items-center px-3 rounded-xl text-[15px] text-fg-muted">
                    Sign out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
