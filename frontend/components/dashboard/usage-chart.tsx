"use client"

import { Card } from "@/components/ui/card"

export interface DailyStats {
  date: string
  documents: number
  letters: number
  users: number
}

interface UsageChartProps {
  data?: DailyStats[]
}

export function UsageChart({ data = [] }: UsageChartProps) {
  // Show last 7 days of data
  const last7Days = data.slice(-7)
  
  // Calculate chart data (show total of documents + letters)
  const chartData = last7Days.map(stat => ({
    label: new Date(stat.date).toLocaleDateString('en-US', { weekday: 'short' }),
    value: stat.documents + stat.letters
  }))

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value), 1) : 1

  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-6">Activity Last 7 Days</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {chartData.length === 0 ? (
          <div className="w-full flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          chartData.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="w-full bg-primary/20 rounded-t relative group cursor-pointer">
                <div
                  className="w-full bg-primary transition-all hover:bg-primary/90 rounded-t"
                  style={{
                    height: `${(item.value / maxValue) * 160}px`,
                    minHeight: item.value > 0 ? '4px' : '0px',
                  }}
                >
                  <div className="text-xs font-semibold text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                    {item.value}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground mt-3">{item.label}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
