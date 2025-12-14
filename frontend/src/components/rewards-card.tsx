
import { Card } from "@/components/ui/card"
import { Gift, Star, Zap, Shield } from "lucide-react"

const rewards = [
  { label: "Cross-chain Points", value: "2,450", icon: Zap, color: "text-primary" },
  { label: "Streak Bonus", value: "7 days", icon: Star, color: "text-accent" },
  { label: "Security Score", value: "95%", icon: Shield, color: "text-blue-500" },
]

export function RewardsCard() {
  return (
    <Card className="p-6 shadow-sm border-border/50 rounded-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Rewards</h2>
          <p className="text-sm text-muted-foreground">ZetaChain cross-chain rewards</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Total Points */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/20 border border-primary/10 mb-4">
        <p className="text-sm text-muted-foreground mb-1">Total Reward Points</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">12,580</span>
          <span className="text-sm text-black">ZETA pts</span>
        </div>
      </div>

      {/* Reward Stats */}
      <div className="space-y-3">
        {rewards.map((reward) => (
          <div key={reward.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <reward.icon className={`w-4 h-4 ${reward.color}`} />
              <span className="text-sm text-muted-foreground">{reward.label}</span>
            </div>
            <span className="font-semibold text-foreground">{reward.value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
