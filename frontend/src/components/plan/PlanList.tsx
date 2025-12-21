// Plans list container component

import { useEffect, useState, useMemo } from 'react'
import { useUserPlans } from '@/hooks/useUserPlans'
import { useMultiChainBalances } from '@/hooks/useMultiChainBalances'
import { PlanCard } from './PlanCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, PiggyBank } from 'lucide-react'

interface PlanListProps {
  initialContext?: {
    targetAmount?: string
    goalDate?: string
    purpose?: string
    notes?: string
  } | null
}

export function PlanList({ initialContext }: PlanListProps) {
  const { plans, planCount, isLoading, isError, error, refetch } = useUserPlans()
  const { assets, isLoading: isLoadingBalances, isConnected } = useMultiChainBalances()
  
  // Calculate total USD value from wallet balances (synchronized with GoalSummaryCard)
  const totalWalletValueUSD = useMemo(() => {
    if (!isConnected || isLoadingBalances) return 0
    return assets.reduce((sum, asset) => {
      if (asset.isLoading || asset.isError) return sum
      // Extract numeric value from string like "$2,890"
      const valueStr = asset.value.replace(/[^0-9.]/g, '')
      const value = parseFloat(valueStr) || 0
      return sum + value
    }, 0)
  }, [assets, isLoadingBalances, isConnected])
  
  // Get target amount in USD from initialContext
  const targetAmountUSD = useMemo(() => {
    if (!initialContext?.targetAmount) return null
    const amount = parseFloat(initialContext.targetAmount)
    return isNaN(amount) ? null : amount
  }, [initialContext?.targetAmount])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // Auto-refresh more frequently when there are plans
  useEffect(() => {
    if (planCount > 0) {
      const interval = setInterval(() => {
        refetch().then(() => {
          setLastRefresh(new Date())
        })
      }, 5000) // Refresh every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [planCount, refetch])
  
  const handleRefetch = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      setLastRefresh(new Date())
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

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
            <Button variant="outline" size="sm" onClick={handleRefetch} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
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
    <Card className="rounded-2xl shadow-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Your Savings Plans ({planCount})
            </CardTitle>
            {lastRefresh && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefetch}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh plans data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          {plans.map((plan) => (
            <PlanCard 
              key={plan.id} 
              plan={plan}
              targetAmountUSD={targetAmountUSD}
              currentAmountUSD={totalWalletValueUSD}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
