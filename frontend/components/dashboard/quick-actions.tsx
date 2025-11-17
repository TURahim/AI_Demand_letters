import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PenTool, FileStack, FileText } from "lucide-react"

export function QuickActions() {
  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/generation">
          <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <PenTool className="w-4 h-4" />
            Generate Letter
          </Button>
        </Link>
        <Link href="/templates">
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <FileStack className="w-4 h-4" />
            Manage Templates
          </Button>
        </Link>
        <Link href="/documents">
          <Button variant="outline" className="w-full gap-2 bg-transparent">
            <FileText className="w-4 h-4" />
            View Documents
          </Button>
        </Link>
      </div>
    </Card>
  )
}
