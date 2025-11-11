"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="border-b-4 border-primary bg-card sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">S</span>
          </div>
          <span className="font-bold text-lg hidden sm:inline">Steno</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/dashboard" className="text-sm hover:text-primary transition">
            Dashboard
          </Link>
          <Link href="/documents" className="text-sm hover:text-primary transition">
            Documents
          </Link>
          <Link href="/templates" className="text-sm hover:text-primary transition">
            Templates
          </Link>
          <Link href="/letters" className="text-sm hover:text-primary transition">
            Letters
          </Link>
        </nav>

        <Button variant="outline" size="sm">
          Sign Out
        </Button>
      </div>
    </header>
  )
}
