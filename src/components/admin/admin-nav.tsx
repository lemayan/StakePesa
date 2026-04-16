"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

type Props = {
  items: NavItem[]
}

export function AdminNav({ items }: Props) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition",
              isActive
                ? "border-green/40 bg-green/10 text-fg shadow-[0_0_0_1px_rgba(34,197,94,0.2)]"
                : "border-transparent text-fg-muted hover:border-line-bright hover:bg-bg hover:text-fg",
            ].join(" ")}
          >
            <span className="flex items-center gap-2.5 font-medium">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
            <span
              className={[
                "h-2 w-2 rounded-full transition",
                isActive ? "bg-green animate-livepulse" : "bg-line group-hover:bg-fg-muted",
              ].join(" ")}
            />
          </Link>
        )
      })}
    </nav>
  )
}