import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    period: string
  }
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  variant?: "default" | "success" | "warning" | "destructive"
}

const variantStyles = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20", 
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20"
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = "neutral",
  variant = "default" 
}: StatsCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-success"
      case "down": return "text-destructive" 
      default: return "text-muted-foreground"
    }
  }

  const getTrendSymbol = () => {
    switch (trend) {
      case "up": return "+"
      case "down": return "-"
      default: return ""
    }
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border",
            variantStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {change && (
              <div className="flex items-center gap-1 mt-1">
                <span className={cn("text-sm font-medium", getTrendColor())}>
                  {getTrendSymbol()}{Math.abs(change.value)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {change.period}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}