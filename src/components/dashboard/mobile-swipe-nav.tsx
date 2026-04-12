"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// The ordered list of swipeable tabs (must match the nav order in sidebar.tsx)
const SWIPE_ROUTES = [
  "/dashboard",
  "/dashboard/markets",
  "/dashboard/wallet",
  "/dashboard/leaderboard",
  "/dashboard/activity",
  "/dashboard/profile",
  "/dashboard/invite",
];

const SWIPE_THRESHOLD = 60;   // min px horizontal drag to trigger navigation
const LOCK_RATIO = 1.8;        // horizontal must be this much larger than vertical to avoid scroll conflict

export function MobileSwipeNav({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;

      // Only navigate if horizontal movement is dominant and exceeds threshold
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * LOCK_RATIO) return;

      // Resolve the current route index
      const currentIndex = SWIPE_ROUTES.findIndex(
        (r) => r === "/dashboard" ? pathname === r : pathname.startsWith(r)
      );
      if (currentIndex === -1) return;

      if (dx < 0) {
        // Swipe left → go to next tab
        const next = SWIPE_ROUTES[currentIndex + 1];
        if (next) router.push(next);
      } else {
        // Swipe right → go to previous tab
        const prev = SWIPE_ROUTES[currentIndex - 1];
        if (prev) router.push(prev);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);

  return (
    <div ref={containerRef} className="min-h-[calc(100vh-120px)]">
      {children}
    </div>
  );
}
