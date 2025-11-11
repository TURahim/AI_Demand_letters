import type React from "react"
import { Card } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  variant?: "primary" | "secondary" | "accent"
}

export function StatsCard({ title, value, change, icon, variant = "primary" }: StatsCardProps) {
  const variantStyles = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    accent: "bg-accent/10 text-accent border-accent/20",
  }

  return (
    <Card className="p-6 border border-border">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {change && <span className="text-xs text-green-600">{change}</span>}
      </div>
    </Card>
  )
}
