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
      refetchInterval: 5000, // Refetch every 5 seconds for better sync
      refetchOnWindowFocus: true,
      staleTime: 0, // Always consider data stale to ensure fresh data
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
      refetchInterval: 5000, // Refetch every 5 seconds for better sync
      refetchOnWindowFocus: true,
      staleTime: 0, // Always consider data stale to ensure fresh data
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
      refetchInterval: 5000, // Refetch every 5 seconds for better sync
      refetchOnWindowFocus: true,
      staleTime: 0, // Always consider data stale to ensure fresh data
    },
  })

  // Step 4: Format the plans for UI display
  const plans = useMemo((): FormattedPlan[] => {
    if (!plansData) {
      console.log('[useUserPlans] No plansData available')
      return []
    }

    const formattedPlans: FormattedPlan[] = []

    for (let index = 0; index < plansData.length; index++) {
      const result = plansData[index]
      if (result.status !== 'success' || !result.result) {
        console.warn(`[useUserPlans] Plan ${index} fetch failed:`, result)
        continue
      }

      const plan = result.result as SavingsPlanOnChain
      console.log(`[useUserPlans] Plan ${index}:`, {
        currentAmount: plan.currentAmount.toString(),
        targetAmount: plan.targetAmount.toString(),
        savingsGoal: plan.savingsGoal,
      })
      
      // Get token info
      const tokenInfo = getTokenByAddress(plan.zrc20Token)
      const decimals = tokenInfo?.decimals ?? 18
      const symbol = tokenInfo?.symbol ?? 'Unknown'
      const chainName = tokenInfo?.chainName ?? getChainName(plan.sourceChainId)

      // Format amounts
      const targetAmountFormatted = formatUnits(plan.targetAmount, decimals)
      const currentAmountFormatted = formatUnits(plan.currentAmount, decimals)

      // Calculate progress: Always use the most accurate calculation
      // Priority: Use contract value if available and meaningful, otherwise calculate from amounts
      let progress = 0
      
      // Try to get progress from contract first
      if (progressData?.[index]?.status === 'success' && progressData[index].result) {
        const contractProgress = Number(progressData[index].result)
        // Use contract value if it's meaningful (> 0) or if currentAmount is 0
        if (contractProgress > 0 || plan.currentAmount === 0n) {
          progress = contractProgress
        }
      }

      // Calculate progress from amounts for better precision, especially for small values
      // This handles cases where contract returns 0 due to integer division but actual progress > 0
      if (plan.currentAmount > 0n && plan.targetAmount > 0n) {
        const currentNum = parseFloat(currentAmountFormatted)
        const targetNum = parseFloat(targetAmountFormatted)
        if (targetNum > 0) {
          const calculatedProgress = Math.min((currentNum / targetNum) * 100, 100)
          // Use calculated progress if it's more accurate (contract might round down to 0)
          // or if contract progress is 0 but we have actual deposits
          if (calculatedProgress > progress || (progress === 0 && currentNum > 0)) {
            progress = calculatedProgress
            console.log(`[useUserPlans] Plan ${index} using calculated progress:`, progress, `(${currentNum} / ${targetNum})`)
          } else {
            console.log(`[useUserPlans] Plan ${index} using contract progress:`, progress)
          }
        }
      }

      formattedPlans.push({
        id: index,
        token: {
          address: plan.zrc20Token,
          symbol,
          decimals,
          chainName,
        },
        targetAmount: targetAmountFormatted,
        currentAmount: currentAmountFormatted,
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

    console.log(`[useUserPlans] Formatted ${formattedPlans.length} plans`)
    return formattedPlans
  }, [plansData, progressData])

  // Combined loading state
  const isLoading = isLoadingCount || isLoadingPlans || isLoadingProgress

  // Combined error state
  const isError = isErrorCount || isErrorPlans
  const error = errorCount || errorPlans || null

  // Combined refetch function
  const refetch = async () => {
    await Promise.all([
      refetchCount(),
      refetchPlans(),
      refetchProgress()
    ])
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
