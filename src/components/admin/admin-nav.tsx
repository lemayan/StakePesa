"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GalleryHorizontalEnd, Gauge, SlidersHorizontal, Trophy, Waypoints } from "lucide-react"

type IconKey = "dashboard" | "markets" | "resolved" | "settings" | "sliders"

const ICONS_BY_KEY = {
  dashboard: Gauge,
  markets: Waypoints,
  resolved: Trophy,
  settings: SlidersHorizontal,
  sliders: GalleryHorizontalEnd,
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
              "group flex items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium transition",
              isActive
                ? "bg-green/10 text-green font-bold"
                : "text-fg-muted hover:bg-bg-above/50 hover:text-fg",
            ].join(" ")}
          >
            <span className="flex items-center gap-2.5">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
            <span
              className={[
                "h-1.5 w-1.5 rounded-full transition",
                isActive ? "bg-green" : "bg-transparent group-hover:bg-line-bright",
              ].join(" ")}
            />
          </Link>
        )
      })}
    </nav>
  )
}