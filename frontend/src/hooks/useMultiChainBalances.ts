// Hook for fetching balances across multiple chains

import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { sepolia, baseSepolia } from 'wagmi/chains'
import { zetaChainAthens } from '@/config/wagmi'

// ERC-20 ABI (minimal for balanceOf)
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const

// Sepolia USDC contract address
const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const

// Mock USD rates for testnet (no real value)
const MOCK_USD_RATES: Record<string, number> = {
  ETH: 2500,
  ZETA: 0.8,
  USDC: 1.0,
}

// Asset colors matching existing design
const ASSET_COLORS: Record<string, string> = {
  ETH: 'bg-[#627EEA]',
  'ETH-BASE': 'bg-[#0052FF]', // Base blue
  ZETA: 'bg-primary',
  USDC: 'bg-[#2775CA]',
}

export interface AssetBalance {
  symbol: string
  name: string
  amount: string        // Formatted string (e.g., "1.245")
  value: string         // USD value string (e.g., "$2,890")
  rawBalance: bigint    // Raw balance for calculations
  color: string         // Tailwind class for badge color
  chainId: number       // Chain ID for reference
  chainName: string     // Human-readable chain name
  isLoading: boolean
  isError: boolean
}

export function useMultiChainBalances() {
  const { address, isConnected } = useAccount()

  // Native balance queries for each chain (with explicit chainId)
  const sepoliaBalance = useBalance({
    address,
    chainId: sepolia.id,
    query: { enabled: isConnected && !!address },
  })

  const baseBalance = useBalance({
    address,
    chainId: baseSepolia.id,
    query: { enabled: isConnected && !!address },
  })

  const zetaBalance = useBalance({
    address,
    chainId: zetaChainAthens.id,
    query: { enabled: isConnected && !!address },
  })

  // USDC balance on Sepolia (ERC-20)
  const usdcBalance = useReadContract({
    address: SEPOLIA_USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: isConnected && !!address },
  })

  // Helper function to format balance and calculate mock USD value
  const formatAsset = (
    symbol: string,
    name: string,
    chainId: number,
    chainName: string,
    data: { value?: bigint; decimals?: number } | undefined,
    isLoading: boolean,
    isError: boolean,
    colorKey: string,
    decimals: number = 18
  ): AssetBalance => {
    const rawBalance = data?.value ?? BigInt(0)
    const formatted = formatUnits(rawBalance, decimals)
    const numericAmount = parseFloat(formatted)
    const rateKey = symbol === 'ETH' ? 'ETH' : symbol
    const usdRate = MOCK_USD_RATES[rateKey] ?? 0
    const usdValue = numericAmount * usdRate

    return {
      symbol,
      name,
      amount: numericAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
      value: `$${usdValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      rawBalance,
      color: ASSET_COLORS[colorKey] ?? 'bg-gray-500',
      chainId,
      chainName,
      isLoading,
      isError,
    }
  }

  // Build assets array
  const assets: AssetBalance[] = [
    formatAsset(
      'ETH',
      'Ethereum',
      sepolia.id,
      'Sepolia',
      sepoliaBalance.data,
      sepoliaBalance.isLoading,
      sepoliaBalance.isError,
      'ETH'
    ),
    formatAsset(
      'ETH',
      'Base',
      baseSepolia.id,
      'Base Sepolia',
      baseBalance.data,
      baseBalance.isLoading,
      baseBalance.isError,
      'ETH-BASE'
    ),
    formatAsset(
      'ZETA',
      'ZetaChain',
      zetaChainAthens.id,
      'Athens',
      zetaBalance.data,
      zetaBalance.isLoading,
      zetaBalance.isError,
      'ZETA'
    ),
    formatAsset(
      'USDC',
      'USD Coin',
      sepolia.id,
      'Sepolia',
      usdcBalance.data !== undefined ? { value: usdcBalance.data as bigint, decimals: 6 } : undefined,
      usdcBalance.isLoading,
      usdcBalance.isError,
      'USDC',
      6 // USDC has 6 decimals
    ),
  ]

  // Overall loading state
  const isLoading =
    sepoliaBalance.isLoading ||
    baseBalance.isLoading ||
    zetaBalance.isLoading ||
    usdcBalance.isLoading

  // Refetch function for manual refresh
  const refetch = () => {
    sepoliaBalance.refetch()
    baseBalance.refetch()
    zetaBalance.refetch()
    usdcBalance.refetch()
  }

  return {
    assets,
    isLoading,
    isConnected,
    refetch,
  }
}
