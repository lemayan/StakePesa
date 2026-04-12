"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";

// Must match the nav order in sidebar.tsx
const SWIPE_ROUTES = [
  "/dashboard",
  "/dashboard/markets",
  "/dashboard/wallet",
  "/dashboard/leaderboard",
  "/dashboard/activity",
  "/dashboard/profile",
  "/dashboard/invite",
];

const SWIPE_THRESHOLD = 55;  // min px horizontal drag
const LOCK_RATIO = 1.8;       // horizontal ÷ vertical must exceed this

export function MobileSwipeNav({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const navigating = useRef(false); // debounce: ignore second swipe while first is in-flight
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Eagerly prefetch every tab route on mount so they're already warm ──
  useEffect(() => {
    SWIPE_ROUTES.forEach((route) => router.prefetch(route));
  }, [router]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (navigating.current) return;
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current || navigating.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * LOCK_RATIO) return;

      const currentIndex = SWIPE_ROUTES.findIndex(
        (r) => (r === "/dashboard" ? pathname === r : pathname.startsWith(r))
      );
      if (currentIndex === -1) return;

      const target = dx < 0
        ? SWIPE_ROUTES[currentIndex + 1]   // swipe left → next
        : SWIPE_ROUTES[currentIndex - 1];   // swipe right → prev

      if (!target) return;

      // startTransition marks the navigation as non-urgent:
      // current page stays interactive, no janky blank flash
      navigating.current = true;
      startTransition(() => {
        router.push(target);
      });
      // Reset lock after a short window so rapid swipes still register
      setTimeout(() => { navigating.current = false; }, 600);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router, startTransition]);

  return (
    <div ref={containerRef} className="min-h-[calc(100vh-120px)]">
      {children}
    </div>
  );
}
