import { Card } from "@/components/ui/card"
import { TrendingUp, ArrowUpRight } from "lucide-react"
import { useMultiChainBalances } from "@/hooks/useMultiChainBalances"
import { useMemo, useEffect, useState } from "react"
import { useAccount } from "wagmi"

// Helper function to get the start of the current week (Monday)
function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0] // Returns YYYY-MM-DD
}

// Helper function to get/set weekly balance snapshot from localStorage
function getWeeklyBalanceSnapshot(weekStart: string, address: string): number | null {
  if (typeof window === 'undefined' || !address) return null
  const key = `weekly_balance_${address}_${weekStart}`
  const stored = localStorage.getItem(key)
  return stored ? parseFloat(stored) : null
}

function setWeeklyBalanceSnapshot(weekStart: string, address: string, balance: number): void {
  if (typeof window === 'undefined' || !address) return
  const key = `weekly_balance_${address}_${weekStart}`
  localStorage.setItem(key, balance.toString())
}

export function ProgressCard() {
  const { assets, isLoading, isConnected } = useMultiChainBalances()
  const { address } = useAccount()
  const [weeklyIncrease, setWeeklyIncrease] = useState<number | null>(null)
  
  // Calculate total USD value from all assets
  const totalValue = useMemo(() => {
    if (!isConnected || isLoading) return 0
    return assets.reduce((sum, asset) => {
      if (asset.isLoading || asset.isError) return sum
      // Extract numeric value from string like "$2,890"
      const valueStr = asset.value.replace(/[^0-9.]/g, '')
      const value = parseFloat(valueStr) || 0
      return sum + value
    }, 0)
  }, [assets, isLoading, isConnected])

  // Track weekly balance changes
  useEffect(() => {
    if (!isConnected || isLoading || !address) {
      setWeeklyIncrease(null)
      return
    }

    // Wait for balance to be loaded
    if (totalValue === 0 && assets.some(a => a.isLoading)) {
      return
    }

    const weekStart = getWeekStart()
    const weekStartBalance = getWeeklyBalanceSnapshot(weekStart, address)

    if (weekStartBalance === null) {
      // First time this week or first time connecting, set the snapshot to current balance
      setWeeklyBalanceSnapshot(weekStart, address, totalValue)
      setWeeklyIncrease(0)
    } else {
      // Calculate increase from start of week
      const increase = totalValue - weekStartBalance
      setWeeklyIncrease(increase)
      
      // Only update snapshot if balance increased (tracking deposits, not withdrawals)
      // This ensures we show the net increase from the start of the week
      if (totalValue > weekStartBalance) {
        setWeeklyBalanceSnapshot(weekStart, address, totalValue)
      }
    }
  }, [totalValue, isConnected, isLoading, address, assets])

  const target = 10000
  const progress = target > 0 ? Math.min((totalValue / target) * 100, 100) : 0
  const saved = Math.round(totalValue)

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
          {isLoading ? (
            <span className="text-3xl font-bold text-muted-foreground">Loading...</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-foreground">${saved.toLocaleString()}</span>
              <span className="text-muted-foreground">/ ${target.toLocaleString()}</span>
            </>
          )}
        </div>
        {isConnected && !isLoading && weeklyIncrease !== null && (
          <div className="flex items-center gap-1 text-sm">
            {weeklyIncrease > 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +${Math.round(weeklyIncrease).toLocaleString()} this week
                </span>
              </>
            ) : weeklyIncrease < 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400 rotate-180" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  ${Math.round(weeklyIncrease).toLocaleString()} this week
                </span>
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">No change this week</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{progress.toFixed(2)}%</span>
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
