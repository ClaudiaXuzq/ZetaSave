
import { Card } from "@/components/ui/card"
import { Target, Calendar, Palmtree } from "lucide-react"

const cryptoAssets = [
  { symbol: "ETH", name: "Ethereum", amount: "1.245", value: "$2,890", color: "bg-[#627EEA]" },
  { symbol: "BTC", name: "Bitcoin", amount: "0.089", value: "$3,856", color: "bg-[#F7931A]" },
  { symbol: "USDT", name: "Tether", amount: "850.00", value: "$850", color: "bg-[#26A17B]" },
  { symbol: "ZETA", name: "ZetaChain", amount: "2,450", value: "$254", color: "bg-primary" },
]

export function GoalSummaryCard() {
  return (
    <Card className="p-6 shadow-sm border-border/50 rounded-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Savings Goal</h2>
          <p className="text-sm text-muted-foreground">Track your progress across chains</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Target className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>

      {/* Goal Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="w-4 h-4" />
            Target
          </div>
          <p className="text-2xl font-bold text-foreground">$10,000</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Calendar className="w-4 h-4" />
            Days Left
          </div>
          <p className="text-2xl font-bold text-foreground">45</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Palmtree className="w-4 h-4" />
            Purpose
          </div>
          <p className="text-lg font-semibold text-foreground">Vacation</p>
        </div>
      </div>

      {/* Crypto Assets */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Assets</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cryptoAssets.map((asset) => (
            <div
              key={asset.symbol}
              className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-full ${asset.color} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {asset.symbol.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{asset.symbol}</p>
                  <p className="text-xs text-muted-foreground">{asset.name}</p>
                </div>
              </div>
              <p className="text-lg font-bold text-foreground">{asset.value}</p>
              <p className="text-xs text-muted-foreground">
                {asset.amount} {asset.symbol}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
