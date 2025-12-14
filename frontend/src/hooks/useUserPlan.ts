// Hook for fetching user's savings plan from the backend API

import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { UserPlanResponse } from '@/types/contracts'

const API_BASE = 'http://127.0.0.1:8000'

export function useUserPlan(planId: number) {
  const { address } = useAccount()

  return useQuery<UserPlanResponse>({
    queryKey: ['user-plan', address, planId],
    queryFn: async () => {
      if (!address) throw new Error('No address connected')
      const response = await fetch(`${API_BASE}/api/plan-progress/${address}/${planId}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to fetch plan')
      }
      return response.json()
    },
    enabled: !!address && planId !== undefined && planId >= 0,
  })
}
