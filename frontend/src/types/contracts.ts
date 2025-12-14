// TypeScript types for ZetaSavings contract responses

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
