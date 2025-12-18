// Hook for creating a new savings plan via Gateway (cross-chain)
// Users call this from Base Sepolia or ETH Sepolia - NOT directly on ZetaChain

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { ZETASAVE_CONTRACT, GATEWAY_ABI, getGatewayForChain, isSourceChain } from '@/config/contracts'

export function useCrossChainCreatePlan() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { chain } = useAccount()

  /**
   * Create a new savings plan via cross-chain message
   * @param targetAmount - The target savings amount (in wei)
   * @param savingsGoal - A description of the savings goal
   * @param initialDeposit - The initial deposit amount (in wei)
   */
  const createPlan = (
    targetAmount: bigint,
    savingsGoal: string,
    initialDeposit: bigint
  ) => {
    if (!chain?.id) {
      throw new Error('Wallet not connected')
    }

    if (!isSourceChain(chain.id)) {
      throw new Error(`Please switch to Base Sepolia or ETH Sepolia to create a plan. Current chain: ${chain.name}`)
    }

    const gateway = getGatewayForChain(chain.id)

    // Encode message: abi.encode(['uint8', 'uint256', 'string'], [0, targetAmount, goalString])
    // opType = 0 means create new plan
    const message = encodeAbiParameters(
      parseAbiParameters('uint8, uint256, string'),
      [0, targetAmount, savingsGoal]
    )

    writeContract({
      address: gateway,
      abi: GATEWAY_ABI,
      functionName: 'depositAndCall',
      args: [ZETASAVE_CONTRACT.address, message],
      value: initialDeposit, // Initial deposit amount
    })
  }

  return {
    createPlan,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
    reset,
    // Helper to check if user is on a valid source chain
    isOnSourceChain: isSourceChain(chain?.id),
    currentChain: chain,
  }
}
