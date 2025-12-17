// Wagmi configuration for multi-chain testnet support

import { http } from 'wagmi'
import { QueryClient } from '@tanstack/react-query'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, baseSepolia } from 'wagmi/chains'
import type { Chain } from 'viem'

// Define ZetaChain Athens Testnet
export const zetaChainAthens: Chain = {
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    name: 'ZETA',
    symbol: 'ZETA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://zetachain-athens.blockscout.com',
    },
  },
  testnet: true,
}

// Create Wagmi config with RainbowKit (multi-chain support)
export const wagmiConfig = getDefaultConfig({
  appName: 'ZetaSave',
  projectId: 'cc6823656c21a071c11d211f10c160ac', // Get from WalletConnect Cloud
  chains: [zetaChainAthens, baseSepolia, sepolia],
  transports: {
    [zetaChainAthens.id]: http(),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
})

// Create QueryClient for React Query
export const queryClient = new QueryClient()
