"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useState } from "react";

const nav = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  },
  {
    label: "Markets",
    href: "/dashboard/markets",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    label: "Wallet",
    href: "/dashboard/wallet",
    icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  },
  {
    label: "Leaderboard",
    href: "/dashboard/leaderboard",
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0013.125 10.875H10.875A3.375 3.375 0 007.5 14.25v4.5m9 0V6a2.25 2.25 0 00-2.25-2.25h-1.372a2.45 2.45 0 00-.606.08l-.173.048a2.45 2.45 0 01-.606.08H11.507a2.45 2.45 0 01-.606-.08l-.173-.048a2.45 2.45 0 00-.606-.08H8.75A2.25 2.25 0 006.5 6v12.75",
    badge: "🏆",
  },
  {
    label: "Activity",
    href: "/dashboard/activity",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  },
  {
    label: "Invite",
    href: "/dashboard/invite",
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-bg border-r border-line transition-all duration-300 ${
          collapsed ? "w-[60px]" : "w-[220px]"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-line shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded bg-green flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[13px]">W</span>
            </div>
            {!collapsed && (
              <span className="text-[15px] font-bold tracking-tight whitespace-nowrap">
                Stake Pesa
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-2.5 h-9 rounded-md px-2.5 text-[14px] transition-all duration-200 group ${
                  active
                    ? "bg-green/8 text-green font-medium"
                    : "text-fg-secondary hover:bg-bg-above hover:text-fg"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-green rounded-r"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <svg
                  className={`w-[18px] h-[18px] shrink-0 ${active ? "text-green" : "text-fg-muted group-hover:text-fg-secondary"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom area */}
        <div className="px-2 pb-2 space-y-1 border-t border-line pt-2">
          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`w-full flex items-center gap-2.5 h-9 rounded-md px-2.5 text-[14px] text-fg-muted hover:text-fg hover:bg-bg-above transition-all`}
          >
            <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {!collapsed && <span className="whitespace-nowrap">Sign out</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full h-8 flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-above transition-all"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-bg/95 backdrop-blur-md border-t border-line flex flex-col items-stretch pb-[env(safe-area-inset-bottom)]">
        {/* Swipe position dots */}
        <div className="flex justify-center gap-1.5 pt-1.5">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <div
                key={item.href}
                className={`rounded-full transition-all duration-300 ${
                  active
                    ? "w-4 h-[3px] bg-green"
                    : "w-[3px] h-[3px] bg-fg-muted/40"
                }`}
              />
            );
          })}
        </div>

        {/* Tab items */}
        <div className="h-14 flex items-center justify-around px-1">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors ${
                  active ? "text-green" : "text-fg-muted"
                }`}
              >
                {/* Active background behind icon */}
                {active && (
                  <motion.div
                    layoutId="mobile-tab-glow"
                    className="absolute inset-x-1 top-1 bottom-1 rounded-xl bg-green/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Top indicator bar */}
                {active && (
                  <motion.div
                    layoutId="mobile-tab-bar"
                    className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full bg-green"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                <svg
                  className="relative w-[22px] h-[22px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className={`relative font-medium ${active ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
