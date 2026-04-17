"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gauge, SlidersHorizontal, Trophy, Waypoints } from "lucide-react"

type IconKey = "dashboard" | "markets" | "resolved" | "settings"

const ICONS_BY_KEY = {
  dashboard: Gauge,
  markets: Waypoints,
  resolved: Trophy,
  settings: SlidersHorizontal,
} as const

export type NavItem = {
  href: string
  label: string
  iconKey: IconKey
}

type Props = {
  items: NavItem[]
}

export function AdminNav({ items }: Props) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS_BY_KEY[item.iconKey]
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition duration-300",
              isActive
                ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-white/20"
                : "text-white/50 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <span className="flex items-center gap-2.5 font-medium">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
            <span
              className={[
                "h-1.5 w-1.5 rounded-full transition duration-300",
                isActive ? "bg-green drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]" : "bg-white/10 group-hover:bg-white/40",
              ].join(" ")}
            />
          </Link>
        )
      })}
    </nav>
  )
}