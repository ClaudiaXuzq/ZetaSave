import { useUserNFTs } from '@/hooks/useUserNFTs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatEther } from 'viem'
import { Trophy, Loader2 } from 'lucide-react'

export function NFTGallery() {
  const { data, isLoading, error } = useUserNFTs()

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

  if (error) {
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
            Error loading NFTs: {error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.nft_count === 0) {
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
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="w-5 h-5" />
        Your Achievement NFTs ({data.nft_count})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.nfts.map((nft) => (
          <Card key={nft.token_id} className="rounded-2xl shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">{nft.goal_description || 'Savings Milestone'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestone:</span>
                <span className="font-medium">{nft.milestone_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {formatEther(BigInt(nft.savings_amount))} ZETA
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {new Date(parseInt(nft.achievement_date) * 1000).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
