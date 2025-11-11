import { AppLayout } from "@/components/layout/app-layout"
import { StatsCard } from "@/components/stats-card"
import { QuickActions } from "@/components/quick-actions"
import { ActivityFeed } from "@/components/activity-feed"
import { UsageChart } from "@/components/usage-chart"
import { FileText, Mail, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-6xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your activity overview</p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Letters Created"
              value="48"
              change="+12% this month"
              icon={<FileText className="w-5 h-5" />}
              variant="primary"
            />
            <StatsCard
              title="Letters Sent"
              value="32"
              change="+8% this month"
              icon={<Mail className="w-5 h-5" />}
              variant="secondary"
            />
            <StatsCard
              title="Templates"
              value="12"
              change="+2 this month"
              icon={<FileText className="w-5 h-5" />}
              variant="accent"
            />
            <StatsCard
              title="Cases Closed"
              value="8"
              change="+3 this month"
              icon={<TrendingUp className="w-5 h-5" />}
              variant="primary"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions />
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Usage Chart */}
            <div className="md:col-span-2">
              <UsageChart />
            </div>

            {/* Activity Feed */}
            <div className="md:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
