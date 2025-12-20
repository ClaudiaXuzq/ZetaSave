// NFT Image component with activated/locked states

import { cn } from '@/lib/utils'

interface NFTImageProps {
  imageUrl: string
  isActivated: boolean
  milestonePercent: number
  className?: string
}

// Convert IPFS URL to HTTP gateway URL
function ipfsToHttp(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  return url
}

export function NFTImage({ imageUrl, isActivated, milestonePercent, className }: NFTImageProps) {
  return (
    <div className={cn('relative aspect-square rounded-xl overflow-hidden bg-muted', className)}>
      {/* NFT Image */}
      <img
        src={ipfsToHttp(imageUrl)}
        alt={`${milestonePercent}% Milestone NFT`}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          !isActivated && 'grayscale brightness-50 opacity-40'
        )}
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="24">🏆</text></svg>'
        }}
      />
      
      {/* Milestone Badge */}
      <div className="absolute top-2 right-2">
        <div
          className={cn(
            'px-2 py-1 rounded-md text-xs font-semibold text-white border-0',
            milestonePercent >= 100
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : 'bg-gradient-to-r from-blue-500 to-cyan-400',
            !isActivated && 'opacity-50'
          )}
        >
          {milestonePercent}%
        </div>
      </div>
    </div>
  )
}
