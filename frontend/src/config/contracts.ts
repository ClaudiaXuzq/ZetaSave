// Contract configuration for ZetaSaveCrossChain
// This is an omnichain application - read from ZetaChain, write via Gateway on source chains

// ZetaSave contract on ZetaChain Athens Testnet
export const ZETASAVE_CONTRACT = {
  address: '0x9BE8A2541A047E9A48d0626d64CF73d8f17D95DD' as `0x${string}`,
  chainId: 7001,
}

// Gateway contracts on source chains (for cross-chain deposits)
export const GATEWAYS: Record<number, `0x${string}`> = {
  84532: '0x0c487a766110c85d301d96e33579c5b317fa4995', // Base Sepolia
  11155111: '0x0c487a766110c85d301d96e33579c5b317fa4995', // ETH Sepolia (same gateway pattern)
}

// Chain IDs
export const CHAIN_IDS = {
  ETH_SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532,
  ZETACHAIN_ATHENS: 7001,
} as const

// Chain names mapping
export const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.ETH_SEPOLIA]: 'ETH Sepolia',
  [CHAIN_IDS.BASE_SEPOLIA]: 'Base Sepolia',
  [CHAIN_IDS.ZETACHAIN_ATHENS]: 'ZetaChain Athens',
}

// Supported ZRC-20 tokens on ZetaChain (representing assets from source chains)
export const SUPPORTED_TOKENS = {
  ETH_SEPOLIA_ETH: {
    address: '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0' as `0x${string}`,
    symbol: 'ETH',
    decimals: 18,
    sourceChainId: CHAIN_IDS.ETH_SEPOLIA,
    chainName: 'ETH Sepolia',
  },
  BASE_SEPOLIA_ETH: {
    address: '0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD' as `0x${string}`,
    symbol: 'ETH',
    decimals: 18,
    sourceChainId: CHAIN_IDS.BASE_SEPOLIA,
    chainName: 'Base Sepolia',
  },
  ETH_SEPOLIA_USDC: {
    address: '0xcC683A782f4B30c138787CB5576a86AF66fdc31d' as `0x${string}`,
    symbol: 'USDC',
    decimals: 6,
    sourceChainId: CHAIN_IDS.ETH_SEPOLIA,
    chainName: 'ETH Sepolia',
  },
  BASE_SEPOLIA_USDC: {
    address: '0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19' as `0x${string}`,
    symbol: 'USDC',
    decimals: 6,
    sourceChainId: CHAIN_IDS.BASE_SEPOLIA,
    chainName: 'Base Sepolia',
  },
} as const

export type SupportedTokenKey = keyof typeof SUPPORTED_TOKENS
export type SupportedToken = (typeof SUPPORTED_TOKENS)[SupportedTokenKey]

// Helper to get Gateway address by chainId
export function getGatewayForChain(chainId: number | undefined): `0x${string}` {
  if (!chainId || !GATEWAYS[chainId]) {
    throw new Error(`No gateway for chain ${chainId}. Supported chains: Base Sepolia (84532), ETH Sepolia (11155111)`)
  }
  return GATEWAYS[chainId]
}

// Helper to get token info by ZRC-20 address
export function getTokenByAddress(address: string): SupportedToken | undefined {
  const normalizedAddress = address.toLowerCase()
  return Object.values(SUPPORTED_TOKENS).find(
    (token) => token.address.toLowerCase() === normalizedAddress
  )
}

// Helper to get chain name by ID
export function getChainName(chainId: number | bigint): string {
  const id = typeof chainId === 'bigint' ? Number(chainId) : chainId
  return CHAIN_NAMES[id] || `Chain ${id}`
}

// Helper to check if a chain is a supported source chain
export function isSourceChain(chainId: number | undefined): boolean {
  return chainId === CHAIN_IDS.ETH_SEPOLIA || chainId === CHAIN_IDS.BASE_SEPOLIA
}

// Helper to get the ZRC-20 token for a source chain and asset type
export function getZRC20ForSourceChain(
  sourceChainId: number,
  assetType: 'ETH' | 'USDC'
): SupportedToken | undefined {
  if (sourceChainId === CHAIN_IDS.ETH_SEPOLIA) {
    return assetType === 'ETH' ? SUPPORTED_TOKENS.ETH_SEPOLIA_ETH : SUPPORTED_TOKENS.ETH_SEPOLIA_USDC
  }
  if (sourceChainId === CHAIN_IDS.BASE_SEPOLIA) {
    return assetType === 'ETH' ? SUPPORTED_TOKENS.BASE_SEPOLIA_ETH : SUPPORTED_TOKENS.BASE_SEPOLIA_USDC
  }
  return undefined
}

// RevertOptions struct for Gateway calls
export type RevertOptions = {
  revertAddress: `0x${string}`
  callOnRevert: boolean
  abortAddress: `0x${string}`
  revertMessage: `0x${string}`
  onRevertGasLimit: bigint
}

// Gateway ABI (with RevertOptions)
export const GATEWAY_ABI = [
  {
    name: 'depositAndCall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'payload', type: 'bytes' },
      {
        name: 'revertOptions',
        type: 'tuple',
        components: [
          { name: 'revertAddress', type: 'address' },
          { name: 'callOnRevert', type: 'bool' },
          { name: 'abortAddress', type: 'address' },
          { name: 'revertMessage', type: 'bytes' },
          { name: 'onRevertGasLimit', type: 'uint256' },
        ],
      },
    ],
    outputs: [],
  },
] as const
