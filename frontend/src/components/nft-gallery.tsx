// NFT Gallery component - displays user's achievement NFTs with chain info

import { useUserNFTs } from '@/hooks/useUserNFTs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Loader2, RefreshCw, ExternalLink } from 'lucide-react'

// Convert IPFS URL to HTTP gateway URL
function ipfsToHttp(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  return url
}

export function NFTGallery() {
  const { nfts, nftCount, isLoading, isError, error, refetch } = useUserNFTs()

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
          <p className="text-sm text-muted-foreground text-center py-8">
            No NFTs yet. Reach savings milestones to earn achievement NFTs!
          </p>
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
