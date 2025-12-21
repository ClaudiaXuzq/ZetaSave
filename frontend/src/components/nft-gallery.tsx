// NFT Gallery component - displays user's achievement NFTs with chain info

import { useUserNFTs } from '@/hooks/useUserNFTs'
import { useUserPlans } from '@/hooks/useUserPlans'
import { useMultiChainBalances } from '@/hooks/useMultiChainBalances'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NFTImage } from '@/components/nft-image'
import { Trophy, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { useMemo } from 'react'

interface NFTGalleryProps {
  initialContext?: {
    targetAmount?: string
    goalDate?: string
    purpose?: string
    notes?: string
  } | null
}

// Convert IPFS URL to HTTP gateway URL
function ipfsToHttp(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  return url
}

export function NFTGallery({ initialContext }: NFTGalleryProps) {
  // All hooks must be called at the top level, before any conditional returns
  const { nfts, nftCount, isLoading, isError, error, refetch } = useUserNFTs()
  const { plans = [], isError: plansError, isLoading: plansLoading } = useUserPlans()
  const { assets, isLoading: isLoadingBalances, isConnected } = useMultiChainBalances()

  // Calculate progress and milestone status - must be called before any conditional returns
  // Use EXACT same logic as PlanCard to calculate progress
  const milestoneStatus = useMemo(() => {
    // Get the latest plan (highest ID) - same logic as PlanList
    const latestPlan = plans && plans.length > 0 ? plans[plans.length - 1] : null
    let progress = 0
    
    if (!plansError && latestPlan && latestPlan.isActive) {
      // Calculate total USD value from wallet balances (same as PlanList)
      const totalWalletValueUSD = isConnected && !isLoadingBalances
        ? assets.reduce((sum, asset) => {
            if (asset.isLoading || asset.isError) return sum
            const valueStr = asset.value.replace(/[^0-9.]/g, '')
            const value = parseFloat(valueStr) || 0
            return sum + value
          }, 0)
        : 0
      
      // Get target amount in USD from initialContext (same as PlanList)
      const targetAmountUSD = initialContext?.targetAmount
        ? (() => {
            const amount = parseFloat(initialContext.targetAmount)
            return isNaN(amount) ? null : amount
          })()
        : null
      
      // Find matching wallet balance for the latest plan's token (same as PlanList)
      const matchingAsset = isConnected && !isLoadingBalances
        ? assets.find(asset => 
            asset.symbol === latestPlan.token.symbol && 
            asset.chainName === latestPlan.token.chainName &&
            !asset.isLoading &&
            !asset.isError
          )
        : null
      
      // Calculate walletBalanceUSD (same as PlanList)
      const walletBalanceUSD = matchingAsset 
        ? parseFloat(matchingAsset.value.replace(/[^0-9.]/g, '')) 
        : null
      
      // Calculate currentUSD (EXACT same logic as PlanCard)
      // Use wallet balance USD if available, otherwise fall back to total wallet value
      const currentUSD = walletBalanceUSD !== null && walletBalanceUSD !== undefined 
        ? walletBalanceUSD 
        : totalWalletValueUSD || 0
      
      // Calculate targetUSD (EXACT same logic as PlanCard)
      const targetUSD = targetAmountUSD ?? (() => {
        // Fallback: convert from ETH if no USD target provided
        const MOCK_USD_RATES: Record<string, number> = {
          ETH: 2500,
          ZETA: 0.8,
          USDC: 1.0,
        }
        const usdRate = MOCK_USD_RATES[latestPlan.token.symbol] ?? 0
        const targetNum = parseFloat(latestPlan.targetAmount)
        return targetNum * usdRate
      })()
      
      // Calculate display progress (EXACT same logic as PlanCard)
      if (targetUSD <= 0) {
        progress = 0
      } else {
        progress = Math.min((currentUSD / targetUSD) * 100, 100)
      }
    } else if (!plansError && latestPlan && typeof latestPlan.progress === 'number') {
      // Fallback: use plan.progress if wallet balances not available
      progress = latestPlan.progress
    }
    
    // Debug logging
    console.log('[NFTGallery] Latest Plan:', latestPlan)
    console.log('[NFTGallery] initialContext:', initialContext)
    console.log('[NFTGallery] Assets:', assets)
    console.log('[NFTGallery] isConnected:', isConnected, 'isLoadingBalances:', isLoadingBalances)
    console.log('[NFTGallery] Progress (EXACT same as PlanCard):', progress)
    
    // Determine activation based on progress thresholds:
    // - 50% milestone NFT is activated when progress >= 50%
    // - 100% milestone NFT is activated when progress >= 99%
    const has50Milestone = progress >= 50
    const has100Milestone = progress >= 99
    
    console.log('[NFTGallery] has50Milestone:', has50Milestone, 'has100Milestone:', has100Milestone)
    
    return {
      progress50: progress >= 50,
      progress100: progress >= 100,
      has50Milestone,
      has100Milestone,
      maxProgress: progress,
    }
  }, [plans, plansError, assets, isConnected, isLoadingBalances, initialContext])

  // Wait for NFTs, plans, and balances to load before showing content
  if (isLoading || plansLoading || isLoadingBalances) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Your Achievement NFTs
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
            <Trophy className="w-5 h-5" />
            Your Achievement NFTs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              Error loading NFTs: {error?.message || 'Unknown error'}
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

  // Default NFT image URLs (IPFS fallback) - different for each milestone
  const getNFTImageUrl = (milestonePercent: number): string => {
    // Use different images for 50% and 100% milestones
    // These should match the images returned by the API/contract tokenURI
    if (milestonePercent === 50) {
      // 50% milestone NFT image
      return 'ipfs://bafybeidcn5iujtcovtyk6b7afu374ybvrjnhlqjzwzp4zfwodzbcmoe5qi'
    } else {
      // 100% milestone NFT image
      return 'ipfs://bafybeidjcgqgolkjyhcezurig5h4azundsgjlx5aqeo5ka26lpdalxfz7i'
    }
  }

  if (nftCount === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Your Achievement NFTs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Reach savings milestones to earn achievement NFTs!
            </p>
            
            {/* NFT Preview Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {/* 50% Milestone NFT */}
              <div className="flex flex-col items-center gap-2">
                <NFTImage
                  imageUrl={getNFTImageUrl(50)}
                  isActivated={milestoneStatus.has50Milestone}
                  milestonePercent={50}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground font-medium">
                  50% Milestone
                </span>
              </div>
              
              {/* 100% Milestone NFT */}
              <div className="flex flex-col items-center gap-2">
                <NFTImage
                  imageUrl={getNFTImageUrl(100)}
                  isActivated={milestoneStatus.has100Milestone}
                  milestonePercent={100}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground font-medium">
                  100% Milestone
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Your Achievement NFTs ({nftCount})
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <Card key={nft.tokenId} className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
            {/* NFT Image */}
            <div className="aspect-square bg-muted relative">
              <img
                src={ipfsToHttp(nft.imageUrl)}
                alt={`NFT #${nft.tokenId}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="24">🏆</text></svg>'
                }}
              />
              {/* Milestone badge overlay */}
              <div className="absolute top-2 right-2">
                <Badge
                  className={
                    nft.milestonePercent >= 100
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-0'
                  }
                >
                  {nft.milestonePercent}% Milestone
                </Badge>
              </div>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {nft.goalDescription || 'Savings Achievement'}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {nft.assetSymbol}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {nft.chainName}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 text-sm pt-0">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Saved:</span>
                <span className="font-medium">
                  {parseFloat(nft.savingsAmount).toFixed(4)} {nft.assetSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Achieved:</span>
                <span className="font-medium">
                  {nft.achievementDate.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Token #{nft.tokenId}
                </span>
                <a
                  href={`https://zetachain-athens.blockscout.com/token/${nft.tokenAddress}/instance/${nft.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
