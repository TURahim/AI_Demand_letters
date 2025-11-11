"use client"

import { Card } from "@/components/ui/card"

export function UsageChart() {
  const data = [
    { week: "Mon", value: 12 },
    { week: "Tue", value: 19 },
    { week: "Wed", value: 15 },
    { week: "Thu", value: 25 },
    { week: "Fri", value: 22 },
    { week: "Sat", value: 8 },
    { week: "Sun", value: 5 },
  ]

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <Card className="p-6 border border-border">
      <h3 className="text-lg font-semibold mb-6">Letters Generated This Week</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((item) => (
          <div key={item.week} className="flex flex-col items-center flex-1">
            <div className="w-full bg-primary/20 rounded-t relative group cursor-pointer">
              <div
                className="w-full bg-primary transition-all hover:bg-primary/90 rounded-t"
                style={{
                  height: `${(item.value / maxValue) * 160}px`,
                }}
              >
                <div className="text-xs font-semibold text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                  {item.value}
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-3">{item.week}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
