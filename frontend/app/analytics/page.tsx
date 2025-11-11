import { AppLayout } from "@/components/layout/app-layout"
import { Card } from "@/components/ui/card"
import { StatsCard } from "@/components/stats-card"
import { UsageChart } from "@/components/usage-chart"
import { TrendingUp, Calendar, Activity } from "lucide-react"

export default function AnalyticsPage() {
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
            <StatsCard title="Total Letters" value="156" icon={<TrendingUp className="w-5 h-5" />} variant="primary" />
            <StatsCard
              title="This Month"
              value="48"
              change="+25% vs last month"
              icon={<Calendar className="w-5 h-5" />}
              variant="secondary"
            />
            <StatsCard title="Success Rate" value="94%" icon={<Activity className="w-5 h-5" />} variant="accent" />
            <StatsCard
              title="Avg. Time"
              value="12 min"
              change="Per letter"
              icon={<Calendar className="w-5 h-5" />}
              variant="primary"
            />
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <UsageChart />
            <Card className="p-6 border border-border">
              <h3 className="text-lg font-semibold mb-6">Template Usage</h3>
              <div className="space-y-4">
                {[
                  { name: "Standard Demand Letter", count: 45, percentage: 28 },
                  { name: "Commercial Dispute", count: 38, percentage: 24 },
                  { name: "Contract Breach", count: 32, percentage: 20 },
                  { name: "Payment Default", count: 27, percentage: 17 },
                  { name: "Other", count: 14, percentage: 9 },
                ].map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
