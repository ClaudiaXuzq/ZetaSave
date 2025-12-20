import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Calendar, Palmtree, Loader2, RefreshCw, Wallet } from "lucide-react"
import { useMultiChainBalances } from "@/hooks/useMultiChainBalances"
import { useMemo } from "react"
import { CrossChainTransfer } from "@/components/cross-chain-transfer"

interface GoalSummaryCardProps {
  initialContext?: {
    targetAmount?: string
    goalDate?: string
    purpose?: string
    notes?: string
  } | null
}

// Purpose value to display text mapping
const purposeDisplayMap: Record<string, string> = {
  "christmas-travel": "Traveling",
  "shopping": "Shopping",
  "loan-repayment": "Loan Repayment",
  "others": "Others",
}

export function GoalSummaryCard({ initialContext }: GoalSummaryCardProps) {
  const { assets, isLoading, isConnected, refetch } = useMultiChainBalances()

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

  // Calculate days left from goalDate
  const daysLeft = useMemo(() => {
    if (!initialContext?.goalDate) return null
    
    const goalDate = new Date(initialContext.goalDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    goalDate.setHours(0, 0, 0, 0)
    
    const diffTime = goalDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  }, [initialContext?.goalDate])

  // Format target amount
  const formattedTargetAmount = useMemo(() => {
    if (!initialContext?.targetAmount) return "$10,000"
    const amount = parseFloat(initialContext.targetAmount)
    if (isNaN(amount)) return "$10,000"
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }, [initialContext?.targetAmount])

  // Get purpose display text
  const purposeDisplay = useMemo(() => {
    if (!initialContext?.purpose) return "Vacation"
    return purposeDisplayMap[initialContext.purpose] || initialContext.purpose
  }, [initialContext?.purpose])

  return (
    <Card className="p-6 shadow-sm border-border/50 rounded-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Savings Goal</h2>
          <p className="text-sm text-muted-foreground">Track your progress across chains</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#228B22' }}>
          <Target className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Goal Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="w-4 h-4" />
            Target
          </div>
          <p className="text-2xl font-bold text-foreground">{formattedTargetAmount}</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Calendar className="w-4 h-4" />
            Days Left
          </div>
          <p className="text-2xl font-bold text-foreground">{daysLeft !== null ? daysLeft : 45}</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Palmtree className="w-4 h-4" />
            Purpose
          </div>
          <p className="text-lg font-semibold text-foreground">{purposeDisplay}</p>
        </div>
      </div>

      {/* Crypto Assets - Real Balance Display */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Your Assets</h3>
            {isConnected && !isLoading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Total Value: <span className="font-semibold text-foreground">${Math.round(totalValue).toLocaleString()}</span>
              </p>
            )}
          </div>
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              className="text-muted-foreground hover:text-foreground"
              disabled={isLoading}
              title="Refresh balances"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Wallet className="w-8 h-8 mb-2" />
            <p className="text-sm">Connect wallet to view balances</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-8 h-8 mb-2 animate-spin" />
            <p className="text-sm">Loading balances...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {assets.map((asset) => (
                <div
                  key={`${asset.symbol}-${asset.chainId}`}
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
                      <p className="text-xs text-muted-foreground">{asset.chainName}</p>
                    </div>
                  </div>

                  {asset.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : asset.isError ? (
                    <p className="text-sm text-destructive">Error loading</p>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-foreground">{asset.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.amount} {asset.symbol}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <CrossChainTransfer />
          </>
        )}
      </div>
    </Card>
  )
}
