'use client'

import { useCallback } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { UsageChart } from "@/components/dashboard/usage-chart"
import { TrendingUp, Calendar, Activity, FileText } from "lucide-react"
import { analyticsApi } from '@/src/api/analytics.api'
import { useApi } from '@/src/hooks/useApi'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsPage() {
  const getUsageStats = useCallback(() => analyticsApi.getUsageStatistics(30), [])
  const getFirmStats = useCallback(() => analyticsApi.getFirmStatistics(), [])
  
  const { data: usageData, loading: usageLoading } = useApi(getUsageStats)
  const { data: firmData, loading: firmLoading } = useApi(getFirmStats)
  
  const usage = usageData?.statistics
  const firm = firmData?.statistics
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Analytics</h1>
            <p className="text-muted-foreground">Detailed metrics and usage statistics</p>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {firmLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </>
            ) : (
              <>
                <StatsCard 
                  title="Total Letters" 
                  value={firm?.totalLetters?.toString() || '0'} 
                  icon={<FileText className="w-5 h-5" />} 
                  variant="primary" 
                />
                <StatsCard
                  title="Total Documents"
                  value={firm?.totalDocuments?.toString() || '0'}
                  icon={<TrendingUp className="w-5 h-5" />}
                  variant="secondary"
                />
                <StatsCard 
                  title="Active Users" 
                  value={firm?.activeUsers?.toString() || '0'} 
                  change={`${firm?.totalUsers || 0} total`}
                  icon={<Activity className="w-5 h-5" />} 
                  variant="accent" 
                />
                <StatsCard
                  title="Storage Used"
                  value={firm ? `${(firm.storageUsed / 1024 / 1024).toFixed(1)} MB` : '0 MB'}
                  icon={<Calendar className="w-5 h-5" />}
                  variant="primary"
                />
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <UsageChart data={usage?.dailyStats} />
            <Card className="p-6 border border-border">
              <h3 className="text-lg font-semibold mb-6">Top Users (Last 30 Days)</h3>
              <div className="space-y-4">
                {usageLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </>
                ) : usage?.topUsers && usage.topUsers.length > 0 ? (
                  usage.topUsers.map((user) => (
                    <div key={user.userId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{user.userName}</span>
                        <span className="text-muted-foreground">
                          {user.documentsCreated + user.lettersCreated} items
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.documentsCreated} docs, {user.lettersCreated} letters
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No user activity yet</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Monthly Stats Table */}
          <Card className="p-6 border border-border">
            <h3 className="text-lg font-semibold mb-6">Monthly Activity (Last 12 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Month</th>
                    <th className="text-right py-3 px-4 font-semibold">Documents</th>
                    <th className="text-right py-3 px-4 font-semibold">Letters</th>
                    <th className="text-right py-3 px-4 font-semibold">Active Users</th>
                  </tr>
                </thead>
                <tbody>
                  {usageLoading ? (
                    <>
                      {[...Array(12)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan={4}>
                            <Skeleton className="h-10 w-full my-1" />
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : usage?.monthlyStats && usage.monthlyStats.length > 0 ? (
                    usage.monthlyStats.map((stat) => (
                      <tr key={stat.month} className="border-b border-border last:border-0">
                        <td className="py-3 px-4">{stat.month}</td>
                        <td className="text-right py-3 px-4">{stat.documents}</td>
                        <td className="text-right py-3 px-4">{stat.letters}</td>
                        <td className="text-right py-3 px-4">{stat.users}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
