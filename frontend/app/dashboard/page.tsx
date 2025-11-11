'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { UsageChart } from "@/components/dashboard/usage-chart"
import { FileText, Mail, TrendingUp } from "lucide-react"
import { lettersApi } from '@/src/api/letters.api'
import { useApi } from '@/src/hooks/useApi'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { data: statsData, loading: statsLoading } = useApi(() => lettersApi.getStats())

  const stats = statsData?.stats

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
            {statsLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </>
            ) : (
              <>
                <StatsCard
                  title="Total Letters"
                  value={stats?.total?.toString() || '0'}
                  change={`${stats?.byStatus?.SENT || 0} sent`}
                  icon={<FileText className="w-5 h-5" />}
                  variant="primary"
                />
                <StatsCard
                  title="This Month"
                  value={stats?.thisMonth?.toString() || '0'}
                  change={`${stats?.thisWeek || 0} this week`}
                  icon={<Mail className="w-5 h-5" />}
                  variant="secondary"
                />
                <StatsCard
                  title="Draft Letters"
                  value={stats?.byStatus?.DRAFT?.toString() || '0'}
                  change={`${stats?.byStatus?.IN_REVIEW || 0} in review`}
                  icon={<FileText className="w-5 h-5" />}
                  variant="accent"
                />
                <StatsCard
                  title="Approved"
                  value={stats?.byStatus?.APPROVED?.toString() || '0'}
                  change={`${stats?.byStatus?.SENT || 0} sent`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  variant="primary"
                />
              </>
            )}
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
