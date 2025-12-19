// Hook for fetching user's NFTs directly from ZetaChain with dynamic metadata parsing

import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { formatUnits, type Abi } from 'viem'
import { useMemo } from 'react'
import ZetaSaveCrossChainABI from '@/abi/ZetaSaveCrossChain.json'
import { ZETASAVE_CONTRACT, getTokenByAddress } from '@/config/contracts'
import type { NFTMetadataOnChain, FormattedNFT, TokenURIMetadata } from '@/types/contracts'

// Cast ABI to correct type
const abi = ZetaSaveCrossChainABI as Abi

// Parse Base64 encoded tokenURI to extract metadata
function parseTokenURI(uri: string): TokenURIMetadata | null {
  try {
    if (!uri.startsWith('data:application/json;base64,')) {
      return null
    }
    const base64Data = uri.replace('data:application/json;base64,', '')
    const jsonString = atob(base64Data)
    return JSON.parse(jsonString) as TokenURIMetadata
  } catch {
    return null
  }
}

// Extract specific attribute from tokenURI metadata
function getAttribute(metadata: TokenURIMetadata | null, traitType: string): string | null {
  if (!metadata) return null
  const attr = metadata.attributes.find(
    (a) => a.trait_type.toLowerCase() === traitType.toLowerCase()
  )
  return attr ? String(attr.value) : null
}

export function useUserNFTs() {
  const { address } = useAccount()

  // Step 1: Get all NFT token IDs for the user
  const {
    data: tokenIds,
    isLoading: isLoadingIds,
    isError: isErrorIds,
    error: errorIds,
    refetch: refetchIds,
  } = useReadContract({
    address: ZETASAVE_CONTRACT.address,
    abi,
    functionName: 'getUserNFTs',
    args: address ? [address] : undefined,
    chainId: ZETASAVE_CONTRACT.chainId,
    query: {
      enabled: !!address,
    },
  })

  // Convert tokenIds to number array
  const tokenIdArray = useMemo(() => {
    if (!tokenIds) return []
    return (tokenIds as bigint[]).map((id) => Number(id))
  }, [tokenIds])

  // Step 2: Batch fetch NFT metadata for all tokens
  const metadataContracts = useMemo(() => {
    if (tokenIdArray.length === 0) return []
    return tokenIdArray.map((id) => ({
      address: ZETASAVE_CONTRACT.address,
      abi,
      functionName: 'getNFTMetadata' as const,
      args: [BigInt(id)] as const,
      chainId: ZETASAVE_CONTRACT.chainId,
    }))
  }, [tokenIdArray])

  const {
    data: metadataResults,
    isLoading: isLoadingMetadata,
    isError: isErrorMetadata,
    error: errorMetadata,
    refetch: refetchMetadata,
  } = useReadContracts({
    contracts: metadataContracts,
    query: {
      enabled: metadataContracts.length > 0,
    },
  })

  // Step 3: Batch fetch tokenURIs for dynamic metadata (chain, asset info)
  const uriContracts = useMemo(() => {
    if (tokenIdArray.length === 0) return []
    return tokenIdArray.map((id) => ({
      address: ZETASAVE_CONTRACT.address,
      abi,
      functionName: 'tokenURI' as const,
      args: [BigInt(id)] as const,
      chainId: ZETASAVE_CONTRACT.chainId,
    }))
  }, [tokenIdArray])

  const {
    data: uriResults,
    isLoading: isLoadingURIs,
    refetch: refetchURIs,
  } = useReadContracts({
    contracts: uriContracts,
    query: {
      enabled: uriContracts.length > 0,
    },
  })

  // Step 4: Format NFTs for UI display
  const nfts: FormattedNFT[] = useMemo(() => {
    if (!metadataResults) return []

    return tokenIdArray
      .map((tokenId, index) => {
        const metadataResult = metadataResults[index]
        if (metadataResult.status !== 'success' || !metadataResult.result) return null

        const metadata = metadataResult.result as NFTMetadataOnChain

        // Parse tokenURI for additional info
        const uri = uriResults?.[index]?.status === 'success'
          ? (uriResults[index].result as string)
          : null
        const parsedURI = uri ? parseTokenURI(uri) : null

        // Get token info from contract config or parsed URI
        const tokenInfo = getTokenByAddress(metadata.tokenAddress)
        const decimals = tokenInfo?.decimals ?? 18

        // Extract chain and asset from tokenURI attributes (more accurate)
        const chainName = getAttribute(parsedURI, 'Chain') || tokenInfo?.chainName || 'Unknown'
        const assetSymbol = getAttribute(parsedURI, 'Asset') || tokenInfo?.symbol || 'Unknown'

        // Get image URL from tokenURI
        const imageUrl = parsedURI?.image || 'ipfs://bafybeidjcgqgolkjyhcezurig5h4azundsgjlx5aqeo5ka26lpdalxfz7i'

        return {
          tokenId,
          milestonePercent: Number(metadata.milestonePercent),
          achievementDate: new Date(Number(metadata.achievementDate) * 1000),
          savingsAmount: formatUnits(metadata.savingsAmount, decimals),
          savingsAmountRaw: metadata.savingsAmount,
          tokenAddress: metadata.tokenAddress,
          chainName,
          assetSymbol,
          goalDescription: metadata.goalDescription,
          imageUrl,
        } satisfies FormattedNFT
      })
      .filter((nft): nft is FormattedNFT => nft !== null)
  }, [tokenIdArray, metadataResults, uriResults])

  // Combined loading state
  const isLoading = isLoadingIds || isLoadingMetadata || isLoadingURIs

  // Combined error state
  const isError = isErrorIds || isErrorMetadata
  const error = errorIds || errorMetadata || null

  // Combined refetch function
  const refetch = () => {
    refetchIds()
    refetchMetadata()
    refetchURIs()
  }

  return {
    nfts,
    nftCount: nfts.length,
    isLoading,
    isError,
    error,
    refetch,
  }
}
