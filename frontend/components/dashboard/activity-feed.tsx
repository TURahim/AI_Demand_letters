"use client"

import { Card } from "@/components/ui/card"
import { FileText, Mail, Edit3, CheckCircle2, User } from "lucide-react"

export interface ActivityItem {
  id: string
  type: 'document' | 'letter' | 'template' | 'user'
  action: string
  description: string
  timestamp: string
  userId?: string
  userName?: string
}

interface ActivityFeedProps {
  activities?: ActivityItem[]
}

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4" />
      case "letter":
        return <Mail className="w-4 h-4" />
      case "template":
        return <Edit3 className="w-4 h-4" />
      case "user":
        return <User className="w-4 h-4" />
      default:
        return <CheckCircle2 className="w-4 h-4" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
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
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:pb-0 last:border-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.description}</p>
                {activity.userName && (
                  <p className="text-xs text-muted-foreground truncate">by {activity.userName}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{formatTime(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
