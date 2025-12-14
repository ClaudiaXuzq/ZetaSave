
import { Card } from "@/components/ui/card"
import { TrendingUp, ArrowUpRight } from "lucide-react"

export function ProgressCard() {
  const progress = 78.5
  const saved = 7850
  const target = 10000

  return (
    <Card className="p-6 shadow-sm border-border/50 rounded-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Progress</h2>
          <p className="text-sm text-muted-foreground">Your savings journey</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-secondary-foreground" />
        </div>
      </div>

      {/* Progress Stats */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-foreground">${saved.toLocaleString()}</span>
          <span className="text-muted-foreground">/ ${target.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-black">
          <ArrowUpRight className="w-4 h-4" />
          <span>+$245 this week</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-4 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary-foreground to-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">🎄 Only ${(target - saved).toLocaleString()} more to your goal!</p>
      </div>
    </Card>
  )
}
