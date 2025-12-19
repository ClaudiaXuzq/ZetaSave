import { Card } from "@/components/ui/card"
import { Target, Calendar, Palmtree, Loader2, RefreshCw, Wallet } from "lucide-react"
import { useMultiChainBalances } from "@/hooks/useMultiChainBalances"

export function GoalSummaryCard() {
  const { assets, isLoading, isConnected, refetch } = useMultiChainBalances()

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

      {/* Crypto Assets - Real Balance Display */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Your Assets</h3>
          {isConnected && (
            <button
              onClick={refetch}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              disabled={isLoading}
              title="Refresh balances"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Wallet className="w-8 h-8 mb-2" />
            <p className="text-sm">Connect wallet to view balances</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        )}
      </div>
    </Card>
  )
}
