// Hook for fetching user's NFTs from the backend API

import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { UserNFTsResponse } from '@/types/contracts'

const API_BASE = 'http://127.0.0.1:8000'

export function useUserNFTs() {
  const { address } = useAccount()

  return useQuery<UserNFTsResponse>({
    queryKey: ['user-nfts', address],
    queryFn: async () => {
      if (!address) throw new Error('No address connected')
      const response = await fetch(`${API_BASE}/api/user-nfts/${address}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to fetch NFTs')
      }
      return response.json()
    },
    enabled: !!address,
  })
}
