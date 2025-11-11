"use client"

import { Card } from "@/components/ui/card"
import { FileText, Mail, Edit3, CheckCircle2 } from "lucide-react"

interface Activity {
  id: string
  type: "created" | "sent" | "edited" | "completed"
  title: string
  description: string
  timestamp: Date
}

export function ActivityFeed() {
  const activities: Activity[] = [
    {
      id: "1",
      type: "created",
      title: "Created new template",
      description: "Commercial Dispute Demand",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: "2",
      type: "sent",
      title: "Letter sent",
      description: "Smith v. Johnson Industries",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      id: "3",
      type: "edited",
      title: "Letter edited",
      description: "Contract Breach Notice",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "4",
      type: "completed",
      title: "Case closed",
      description: "Settlement reached",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "created":
        return <FileText className="w-4 h-4" />
      case "sent":
        return <Mail className="w-4 h-4" />
      case "edited":
        return <Edit3 className="w-4 h-4" />
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:pb-0 last:border-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{activity.title}</p>
              <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatTime(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
