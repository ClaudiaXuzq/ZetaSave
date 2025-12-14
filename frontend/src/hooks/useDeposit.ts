// Hook for depositing to the ZetaSavings contract

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import ZetaSavingsABI from '@/abi/ZetaSavings.json'

const CONTRACT_ADDRESS = '0x00C44615A4e7DE83A82C62A575B1A33B473312Cc'

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const deposit = (planId: number, amount: string) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ZetaSavingsABI,
      functionName: 'deposit',
      args: [BigInt(planId), parseEther(amount)],
      value: parseEther(amount), // CRITICAL: Include value for payable function
    })
  }

  return {
    deposit,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  }
}
