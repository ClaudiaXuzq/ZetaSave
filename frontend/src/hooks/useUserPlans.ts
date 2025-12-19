// Hook for fetching user's savings plans directly from ZetaChain

import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { formatUnits, type Abi } from 'viem'
import { useMemo } from 'react'
import ZetaSaveCrossChainABI from '@/abi/ZetaSaveCrossChain.json'
import { ZETASAVE_CONTRACT, getTokenByAddress, getChainName } from '@/config/contracts'
import type { SavingsPlanOnChain, FormattedPlan } from '@/types/contracts'

// Cast ABI to correct type
const abi = ZetaSaveCrossChainABI as Abi

export function useUserPlans() {
  const { address } = useAccount()

  // Step 1: Get the number of plans for the user
  const {
    data: planCount,
    isLoading: isLoadingCount,
    isError: isErrorCount,
    error: errorCount,
    refetch: refetchCount,
  } = useReadContract({
    address: ZETASAVE_CONTRACT.address,
    abi,
    functionName: 'userPlanCount',
    args: address ? [address] : undefined,
    chainId: ZETASAVE_CONTRACT.chainId,
    query: {
      enabled: !!address,
    },
  })

  // Generate plan IDs array
  const planIds = useMemo(() => {
    if (!planCount) return []
    const count = Number(planCount)
    return Array.from({ length: count }, (_, i) => i)
  }, [planCount])

  // Step 2: Batch fetch all plans using multicall
  const planContracts = useMemo(() => {
    if (!address || planIds.length === 0) return []
    return planIds.map((id) => ({
      address: ZETASAVE_CONTRACT.address,
      abi,
      functionName: 'getUserPlan' as const,
      args: [address, BigInt(id)] as const,
      chainId: ZETASAVE_CONTRACT.chainId,
    }))
  }, [address, planIds])

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    isError: isErrorPlans,
    error: errorPlans,
    refetch: refetchPlans,
  } = useReadContracts({
    contracts: planContracts,
    query: {
      enabled: planContracts.length > 0,
    },
  })

  // Step 3: Batch fetch progress for all plans
  const progressContracts = useMemo(() => {
    if (!address || planIds.length === 0) return []
    return planIds.map((id) => ({
      address: ZETASAVE_CONTRACT.address,
      abi,
      functionName: 'getProgress' as const,
      args: [address, BigInt(id)] as const,
      chainId: ZETASAVE_CONTRACT.chainId,
    }))
  }, [address, planIds])

  const {
    data: progressData,
    isLoading: isLoadingProgress,
    refetch: refetchProgress,
  } = useReadContracts({
    contracts: progressContracts,
    query: {
      enabled: progressContracts.length > 0,
    },
  })

  // Step 4: Format the plans for UI display
  const plans = useMemo((): FormattedPlan[] => {
    if (!plansData) return []

    const formattedPlans: FormattedPlan[] = []

    for (let index = 0; index < plansData.length; index++) {
      const result = plansData[index]
      if (result.status !== 'success' || !result.result) continue

      const plan = result.result as SavingsPlanOnChain
      const progress = progressData?.[index]?.status === 'success'
        ? Number(progressData[index].result)
        : 0

      // Get token info
      const tokenInfo = getTokenByAddress(plan.zrc20Token)
      const decimals = tokenInfo?.decimals ?? 18
      const symbol = tokenInfo?.symbol ?? 'Unknown'
      const chainName = tokenInfo?.chainName ?? getChainName(plan.sourceChainId)

      formattedPlans.push({
        id: index,
        token: {
          address: plan.zrc20Token,
          symbol,
          decimals,
          chainName,
        },
        targetAmount: formatUnits(plan.targetAmount, decimals),
        currentAmount: formatUnits(plan.currentAmount, decimals),
        targetAmountRaw: plan.targetAmount,
        currentAmountRaw: plan.currentAmount,
        progress,
        startTime: new Date(Number(plan.startTime) * 1000),
        savingsGoal: plan.savingsGoal,
        isActive: plan.isActive,
        milestones: {
          fifty: plan.milestone50Claimed,
          hundred: plan.milestone100Claimed,
        },
        sourceChainId: Number(plan.sourceChainId),
      })
    }

    return formattedPlans
  }, [plansData, progressData])

  // Combined loading state
  const isLoading = isLoadingCount || isLoadingPlans || isLoadingProgress

  // Combined error state
  const isError = isErrorCount || isErrorPlans
  const error = errorCount || errorPlans || null

  // Combined refetch function
  const refetch = () => {
    refetchCount()
    refetchPlans()
    refetchProgress()
  }

  return {
    plans,
    planCount: planCount ? Number(planCount) : 0,
    isLoading,
    isError,
    error,
    refetch,
  }
}
