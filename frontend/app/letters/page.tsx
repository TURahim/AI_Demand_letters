import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Download, Send, Edit2, Trash2, Eye } from "lucide-react"
import Link from "next/link"

interface Letter {
  id: string
  recipient: string
  amount: string
  status: "draft" | "sent" | "delivered" | "closed"
  createdAt: Date
  updatedAt: Date
}

export default function LettersPage() {
  const letters: Letter[] = [
    {
      id: "1",
      recipient: "John Smith",
      amount: "$5,000.00",
      status: "delivered",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      recipient: "ABC Corp",
      amount: "$12,500.00",
      status: "sent",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      recipient: "Sarah Johnson",
      amount: "$3,200.00",
      status: "draft",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground"
      case "sent":
        return "bg-secondary/10 text-secondary"
      case "delivered":
        return "bg-primary/10 text-primary"
      case "closed":
        return "bg-accent/10 text-accent"
      default:
        return ""
    }
  }

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

          {/* Search and Filter */}
          <div className="mb-6 flex gap-4">
            <Input placeholder="Search letters..." className="max-w-sm" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                All
              </Button>
              <Button variant="outline" size="sm">
                Draft
              </Button>
              <Button variant="outline" size="sm">
                Sent
              </Button>
              <Button variant="outline" size="sm">
                Closed
              </Button>
            </div>
          </div>

          {/* Letters Table */}
          <div className="space-y-2">
            {letters.map((letter) => (
              <Card key={letter.id} className="p-4 border border-border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{letter.recipient}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${getStatusColor(
                          letter.status,
                        )}`}
                      >
                        {letter.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Amount: {letter.amount}</span>
                      <span>Created: {letter.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Link href="/editor">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {letters.length === 0 && (
            <Card className="p-12 text-center border border-border">
              <p className="text-muted-foreground mb-4">No letters yet</p>
              <Link href="/generation">
                <Button className="bg-primary hover:bg-primary/90">Create Your First Letter</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
