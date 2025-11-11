'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { LetterList } from "@/components/letters/letter-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LettersPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-6xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Letters</h1>
              <p className="text-muted-foreground">Manage your generated demand letters</p>
            </div>
            <Link href="/generation">
              <Button className="bg-primary hover:bg-primary/90">New Letter</Button>
            </Link>
          </div>

          {/* Letter List Component */}
          <LetterList showActions={true} />
        </div>
      </div>
    </AppLayout>
  )
}
