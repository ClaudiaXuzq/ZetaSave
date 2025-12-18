// TypeScript types for ZetaSaveCrossChain contract

// =============================================================================
// Raw on-chain types (matching Solidity structs)
// =============================================================================

export interface SavingsPlanOnChain {
  zrc20Token: `0x${string}`
  targetAmount: bigint
  currentAmount: bigint
  startTime: bigint
  savingsGoal: string
  isActive: boolean
  milestone50Claimed: boolean
  milestone100Claimed: boolean
  sourceChainId: bigint
}

export interface NFTMetadataOnChain {
  milestonePercent: bigint
  achievementDate: bigint
  savingsAmount: bigint
  tokenAddress: `0x${string}`
  goalDescription: string
}

// =============================================================================
// Formatted types for UI display
// =============================================================================

export interface FormattedPlan {
  id: number
  token: {
    address: `0x${string}`
    symbol: string
    decimals: number
    chainName: string
  }
  targetAmount: string      // Formatted with decimals (e.g., "1.5")
  currentAmount: string     // Formatted with decimals (e.g., "0.75")
  targetAmountRaw: bigint
  currentAmountRaw: bigint
  progress: number          // 0-100
  startTime: Date
  savingsGoal: string
  isActive: boolean
  milestones: {
    fifty: boolean
    hundred: boolean
  }
  sourceChainId: number
}

export interface FormattedNFT {
  tokenId: number
  milestonePercent: number
  achievementDate: Date
  savingsAmount: string     // Formatted with decimals
  savingsAmountRaw: bigint
  tokenAddress: `0x${string}`
  chainName: string
  assetSymbol: string
  goalDescription: string
  imageUrl: string
}

// =============================================================================
// Token URI parsed metadata (from Base64 JSON)
// =============================================================================

export interface TokenURIAttribute {
  trait_type: string
  value: string | number
  display_type?: string
}

export interface TokenURIMetadata {
  name: string
  description: string
  image: string
  attributes: TokenURIAttribute[]
}

// =============================================================================
// Hook return types
// =============================================================================

export interface UseUserPlansResult {
  plans: FormattedPlan[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export interface UseUserNFTsResult {
  nfts: FormattedNFT[]
  nftCount: number
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

// =============================================================================
// Legacy types (for backward compatibility with existing code)
// =============================================================================

export interface NFTMetadata {
  token_id: number
  milestone_percent: string
  achievement_date: string
  savings_amount: string
  token_address: string
  goal_description: string
}

export interface UserNFTsResponse {
  user_address: string
  nft_count: number
  nfts: NFTMetadata[]
}

export interface UserPlanResponse {
  token_address: string
  target_amount: string
  current_amount: string
  amount_per_cycle: string
  cycle_frequency: number
  start_time: string
  last_deposit_time: string
  is_active: boolean
  milestone_50_claimed: boolean
  milestone_100_claimed: boolean
  savings_goal: string
  progress_percent: string
}
