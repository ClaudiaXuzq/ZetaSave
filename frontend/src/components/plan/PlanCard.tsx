// Single savings plan display card

import { Badge } from '@/components/ui/badge'
import { PlanProgress } from './PlanProgress'
import type { FormattedPlan } from '@/types/contracts'
import { Target, Calendar, Coins } from 'lucide-react'
import { useMemo } from 'react'

interface PlanCardProps {
  plan: FormattedPlan
  targetAmountUSD?: number | null  // Target amount in USD from initialContext
  currentAmountUSD?: number        // Current wallet total value in USD
}

export function PlanCard({ plan, targetAmountUSD, currentAmountUSD = 0 }: PlanCardProps) {
  // Format amounts for display (limit decimal places)
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'
    return num.toFixed(4).replace(/\.?0+$/, '')
  }

  // Use USD amounts from props (synchronized with GoalSummaryCard and wallet balances)
  // If targetAmountUSD is provided, use it; otherwise fall back to converting from ETH
  const currentUSD = currentAmountUSD || 0
  const targetUSD = targetAmountUSD ?? (() => {
    // Fallback: convert from ETH if no USD target provided
    const MOCK_USD_RATES: Record<string, number> = {
      ETH: 2500,
      ZETA: 0.8,
      USDC: 1.0,
    }
    const usdRate = MOCK_USD_RATES[plan.token.symbol] ?? 0
    const targetNum = parseFloat(plan.targetAmount)
    return targetNum * usdRate
  })()

  // Calculate progress based on USD amounts (synchronized with wallet balance card)
  const displayProgress = useMemo(() => {
    if (targetUSD <= 0) return 0
    return Math.min((currentUSD / targetUSD) * 100, 100)
  }, [currentUSD, targetUSD])

  // Format USD values
  const formatUSD = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`
  }

  return (
    <div className="border border-border/50 rounded-xl p-4 bg-card/50 hover:bg-card/70 transition-colors">
      <div className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold">
              {plan.savingsGoal || 'Savings Plan'}
            </h3>
          </div>
          <div className="flex gap-1.5">
            {plan.isActive ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-600/50 bg-emerald-50">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Closed
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Badge variant="secondary" className="text-xs font-normal">
            {plan.token.symbol} on {plan.token.chainName}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {/* Progress section */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {displayProgress < 0.01 && displayProgress > 0 
                ? '<0.01%' 
                : displayProgress.toFixed(2) + '%'}
            </span>
          </div>
          <PlanProgress
            progress={displayProgress}
            milestones={plan.milestones}
          />
        </div>

        {/* Amount details */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="w-4 h-4" />
              Current
            </span>
            <div className="flex flex-col items-end">
              <span className="font-medium">
                {formatUSD(currentUSD)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatAmount(plan.currentAmount)} {plan.token.symbol}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="w-4 h-4" />
              Target
            </span>
            <div className="flex flex-col items-end">
              <span className="font-medium">
                {formatUSD(targetUSD)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatAmount(plan.targetAmount)} {plan.token.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Start date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="w-3.5 h-3.5" />
          Started {plan.startTime.toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
