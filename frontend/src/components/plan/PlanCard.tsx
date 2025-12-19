// Single savings plan display card

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlanProgress } from './PlanProgress'
import type { FormattedPlan } from '@/types/contracts'
import { Target, Calendar, Coins } from 'lucide-react'

interface PlanCardProps {
  plan: FormattedPlan
}

export function PlanCard({ plan }: PlanCardProps) {
  // Format amounts for display (limit decimal places)
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'
    return num.toFixed(4).replace(/\.?0+$/, '')
  }

  return (
    <Card className="rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              {plan.savingsGoal || 'Savings Plan'}
            </CardTitle>
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
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress section */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{plan.progress}%</span>
          </div>
          <PlanProgress
            progress={plan.progress}
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
            <span className="font-medium">
              {formatAmount(plan.currentAmount)} {plan.token.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="w-4 h-4" />
              Target
            </span>
            <span className="font-medium">
              {formatAmount(plan.targetAmount)} {plan.token.symbol}
            </span>
          </div>
        </div>

        {/* Start date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="w-3.5 h-3.5" />
          Started {plan.startTime.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}
