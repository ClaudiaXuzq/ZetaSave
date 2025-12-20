// Hook for creating a new savings plan via Gateway (cross-chain)
// Users call this from Base Sepolia or ETH Sepolia - NOT directly on ZetaChain

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { ZETASAVE_CONTRACT, GATEWAY_ABI, getGatewayForChain, isSourceChain, type RevertOptions } from '@/config/contracts'

export function useCrossChainCreatePlan() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { chain } = useAccount()

  /**
   * Create a new savings plan via cross-chain message
   * @param targetAmount - The target savings amount (in wei)
   * @param savingsGoal - A description of the savings goal
   * @param initialDeposit - The initial deposit amount (in wei)
   * @param userAddress - The user's wallet address for revert handling
   */
  const createPlan = (
    targetAmount: bigint,
    savingsGoal: string,
    initialDeposit: bigint,
    userAddress: `0x${string}`
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

    // RevertOptions for handling failed cross-chain calls
    const revertOptions: RevertOptions = {
      revertAddress: userAddress,
      callOnRevert: false,
      abortAddress: userAddress,
      revertMessage: '0x' as `0x${string}`,
      onRevertGasLimit: BigInt(0),
    }

    writeContract({
      address: gateway,
      abi: GATEWAY_ABI,
      functionName: 'depositAndCall',
      args: [ZETASAVE_CONTRACT.address, message, revertOptions],
      value: initialDeposit, // Initial deposit amount
      gas: BigInt(500000), // Explicit gas limit to avoid exceeding network cap
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
