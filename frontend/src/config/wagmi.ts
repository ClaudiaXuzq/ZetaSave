// Wagmi configuration for ZetaChain Athens Testnet

import { http, createConfig } from 'wagmi'
import { QueryClient } from '@tanstack/react-query'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
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

// Create Wagmi config with RainbowKit
export const wagmiConfig = getDefaultConfig({
  appName: 'ZetaSave',
  projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect Cloud
  chains: [zetaChainAthens],
  transports: {
    [zetaChainAthens.id]: http(),
  },
})

// Create QueryClient for React Query
export const queryClient = new QueryClient()
