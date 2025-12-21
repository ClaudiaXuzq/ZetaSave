// NFT Gallery component - displays user's achievement NFTs with chain info

import { useUserNFTs } from '@/hooks/useUserNFTs'
import { useUserPlans } from '@/hooks/useUserPlans'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NFTImage } from '@/components/nft-image'
import { Trophy, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { useMemo } from 'react'

// Convert IPFS URL to HTTP gateway URL
function ipfsToHttp(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  return url
}

export function NFTGallery() {
  // All hooks must be called at the top level, before any conditional returns
  const { nfts, nftCount, isLoading, isError, error, refetch } = useUserNFTs()
  const { plans = [], isError: plansError, isLoading: plansLoading } = useUserPlans()

  // Calculate progress and milestone status - must be called before any conditional returns
  // Check if user actually owns NFTs for each milestone (most accurate method)
  const milestoneStatus = useMemo(() => {
    // First, check if user owns NFTs for each milestone
    const has50MilestoneNFT = nfts.some(nft => nft.milestonePercent === 50)
    const has100MilestoneNFT = nfts.some(nft => nft.milestonePercent === 100)
    
    // Also check plan milestones as fallback
    let has50MilestoneFromPlans = false
    let has100MilestoneFromPlans = false
    
    if (!plansError && plans && plans.length > 0) {
      const activePlans = plans.filter(p => p && p.isActive && typeof p.progress === 'number')
      if (activePlans.length > 0) {
        has50MilestoneFromPlans = activePlans.some(p => p.milestones?.fifty === true)
        has100MilestoneFromPlans = activePlans.some(p => p.milestones?.hundred === true)
      }
    }
    
    // Use NFT ownership as primary indicator, fallback to plan milestones
    const has50Milestone = has50MilestoneNFT || has50MilestoneFromPlans
    const has100Milestone = has100MilestoneNFT || has100MilestoneFromPlans
    
    // Calculate progress for display
    let maxProgress = 0
    if (!plansError && plans && plans.length > 0) {
      const activePlans = plans.filter(p => p && p.isActive && typeof p.progress === 'number')
      if (activePlans.length > 0) {
        const progressValues = activePlans.map(p => p.progress).filter(p => typeof p === 'number' && !isNaN(p) && isFinite(p))
        maxProgress = progressValues.length > 0 ? Math.max(...progressValues) : 0
      }
    }
    
    return {
      progress50: maxProgress >= 50,
      progress100: maxProgress >= 100,
      has50Milestone,
      has100Milestone,
    }
  }, [nfts, plans, plansError])

  if (isLoading) {
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
