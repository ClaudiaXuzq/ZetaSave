// Plans list container component

import { useUserPlans } from '@/hooks/useUserPlans'
import { PlanCard } from './PlanCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, PiggyBank } from 'lucide-react'

export function PlanList() {
  const { plans, planCount, isLoading, isError, error, refetch } = useUserPlans()

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Your Savings Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Your Savings Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              Error loading plans: {error?.message || 'Unknown error'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (planCount === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5" />
            Your Savings Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No savings plans yet. Create your first plan to start saving!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PiggyBank className="w-5 h-5" />
          Your Savings Plans ({planCount})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  )
}
