"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { FileText, FileStack, PenTool, BarChart3, Settings, Mail } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/letters", label: "Letters", icon: Mail },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/generation", label: "Generate Letter", icon: PenTool },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-sidebar-foreground opacity-60">MENU</h2>
      </div>

      <nav className="flex-1 px-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent",
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
