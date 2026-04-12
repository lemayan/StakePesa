"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/create": "Create Challenge",
  "/dashboard/challenges": "Challenge Details",
  "/dashboard/markets": "Markets",
  "/dashboard/markets/create": "Create Bet",
  "/dashboard/wallet": "Wallet",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/activity": "Activity",
  "/dashboard/profile": "Profile",
  "/dashboard/invite": "Invite & Earn",
  "/dashboard/notifications": "Notifications",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const title = Object.entries(titles).find(([k]) =>
    k === "/dashboard" ? pathname === k : pathname.startsWith(k)
  )?.[1] ?? "Dashboard";

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-5 border-b border-line bg-bg sticky top-0 z-30">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-mono text-fg-muted hidden sm:inline">/</span>
        <span className="text-[14px] font-mono font-medium text-fg">{title}</span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5">
        {/* Search toggle — triggers Ctrl+K */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
          }}
          className="flex items-center gap-2 h-8 px-2.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-above transition-all border border-transparent hover:border-line"
        >
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="hidden sm:inline text-[11px] font-mono text-fg-muted">Search</span>
          <kbd className="hidden sm:inline text-[9px] font-mono text-fg-muted bg-bg-above px-1 py-0.5 rounded border border-line">
            Ctrl+K
          </kbd>
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-above transition-all"
        >
          <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>

        </Link>

        {/* Live status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 h-7 rounded bg-green/5 border border-green/10">
          <span className="w-1.5 h-1.5 bg-green rounded-full" />
          <span className="text-[11px] font-mono text-green font-medium">LIVE</span>
        </div>

        <ThemeToggle />

        {/* User name + Avatar */}
        <Link href="/dashboard/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity ml-1">
          <span className="hidden sm:inline text-[13px] font-medium text-fg-secondary truncate max-w-[120px]">
            {session?.user?.name || "User"}
          </span>
          <div className="w-8 h-8 rounded-md bg-bg-above border border-line flex items-center justify-center text-[12px] font-mono font-bold text-fg-muted shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="w-full h-full rounded-md object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </Link>
        
        {/* Mobile / Persistent Logout */}
        <button
          onClick={() => {
            // Import signOut from next-auth/react at the top if needed (it wasn't imported in header.tsx, I will use regular fetch or standard a tag if not available. Wait, signOut is imported!)
            import("next-auth/react").then((m) => m.signOut({ callbackUrl: "/" }));
          }}
          title="Sign out"
          className="ml-1 md:hidden flex items-center justify-center w-8 h-8 rounded-md text-fg-muted hover:text-red hover:bg-red/10 transition-all border border-transparent hover:border-red/20"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
