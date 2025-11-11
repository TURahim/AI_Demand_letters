'use client'

import { useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { UsageChart } from "@/components/dashboard/usage-chart"
import { FileText, Mail, TrendingUp, Upload } from "lucide-react"
import { analyticsApi } from '@/src/api/analytics.api'
import { useApi } from '@/src/hooks/useApi'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const getMetrics = useCallback(() => analyticsApi.getDashboardMetrics(), [])
  const { data: metricsData, loading: metricsLoading } = useApi(getMetrics)

  const metrics = metricsData?.metrics

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
            {metricsLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </>
            ) : (
              <>
                <StatsCard
                  title="Total Documents"
                  value={metrics?.totalDocuments?.toString() || '0'}
                  change={`${metrics?.documentsThisMonth || 0} this month`}
                  icon={<Upload className="w-5 h-5" />}
                  variant="primary"
                />
                <StatsCard
                  title="Total Letters"
                  value={metrics?.totalLetters?.toString() || '0'}
                  change={`${metrics?.lettersThisMonth || 0} this month`}
                  icon={<FileText className="w-5 h-5" />}
                  variant="secondary"
                />
                <StatsCard
                  title="Templates"
                  value={metrics?.totalTemplates?.toString() || '0'}
                  change="Available"
                  icon={<Mail className="w-5 h-5" />}
                  variant="accent"
                />
                <StatsCard
                  title="Active Users"
                  value={metrics?.activeUsers?.toString() || '0'}
                  change="Last 30 days"
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
              <UsageChart data={metrics?.dailyStats} />
            </div>

            {/* Activity Feed */}
            <div className="md:col-span-1">
              <ActivityFeed activities={metrics?.recentActivity} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
