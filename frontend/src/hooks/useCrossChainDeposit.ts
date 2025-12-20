// Hook for depositing to an existing savings plan via Gateway (cross-chain)
// Users call this from Base Sepolia or ETH Sepolia - NOT directly on ZetaChain

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { ZETASAVE_CONTRACT, GATEWAY_ABI, getGatewayForChain, isSourceChain, type RevertOptions } from '@/config/contracts'

export function useCrossChainDeposit() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const { chain } = useAccount()

  /**
   * Deposit to an existing savings plan via cross-chain message
   * @param planId - The ID of the plan to deposit to
   * @param amount - The amount to deposit (in wei)
   */
  const deposit = (planId: number, amount: bigint, userAddress: `0x${string}`) => {
    if (!chain?.id) {
      throw new Error('Wallet not connected')
    }

    if (!isSourceChain(chain.id)) {
      throw new Error(`Please switch to Base Sepolia or ETH Sepolia to deposit. Current chain: ${chain.name}`)
    }

    const gateway = getGatewayForChain(chain.id)

    // Encode message: abi.encode(['uint8', 'uint256', 'string'], [1, planId, ""])
    // opType = 1 means deposit to existing plan
    const message = encodeAbiParameters(
      parseAbiParameters('uint8, uint256, string'),
      [1, BigInt(planId), '']
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
      value: amount, // Send ETH with the transaction
      gas: BigInt(500000), // Explicit gas limit to avoid exceeding network cap
    })
  }

  return {
    deposit,
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
