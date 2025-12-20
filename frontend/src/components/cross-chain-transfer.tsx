import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMultiChainBalances } from "@/hooks/useMultiChainBalances"
import { useCrossChainDeposit } from "@/hooks/useCrossChainDeposit"
import { useUserPlans } from "@/hooks/useUserPlans"
import { useAccount, useSwitchChain } from "wagmi"
import { parseUnits } from "viem"
import { ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { CHAIN_IDS, CHAIN_NAMES, isSourceChain } from "@/config/contracts"
import { sepolia, baseSepolia } from "wagmi/chains"

export function CrossChainTransfer() {
  const { assets, isConnected } = useMultiChainBalances()
  const { deposit, isPending, isConfirming, isSuccess, error, reset, isOnSourceChain } = useCrossChainDeposit()
  const { plans, isLoading: isLoadingPlans } = useUserPlans()
  const { chain, address } = useAccount()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  
  const [fromAsset, setFromAsset] = useState<string>("")
  const [toAsset, setToAsset] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [planId, setPlanId] = useState<string>("")
  
  // Get selected plan details
  const selectedPlan = plans.find((plan) => plan.id.toString() === planId)

  // Filter assets that have balance > 0 and are on source chains
  const availableAssets = assets.filter(
    (asset) => 
      !asset.isLoading && 
      !asset.isError && 
      asset.rawBalance > BigInt(0) &&
      isSourceChain(asset.chainId)
  )

  // Get selected asset details
  const fromAssetDetails = assets.find(
    (asset) => `${asset.symbol}-${asset.chainId}` === fromAsset
  )

  // Check if current chain matches the selected source asset chain
  const needsChainSwitch = fromAssetDetails && chain?.id !== fromAssetDetails.chainId && isSourceChain(fromAssetDetails.chainId)

  // Handler for manual chain switch
  const handleSwitchChain = () => {
    if (!fromAssetDetails) return
    
    const targetChainId = fromAssetDetails.chainId
    if (targetChainId === CHAIN_IDS.ETH_SEPOLIA) {
      switchChain({ chainId: sepolia.id })
    } else if (targetChainId === CHAIN_IDS.BASE_SEPOLIA) {
      switchChain({ chainId: baseSepolia.id })
    }
  }

  const handleConfirm = async () => {
    if (!fromAsset || !toAsset || !amount) {
      toast({
        title: "Missing Information",
        description: "Please select source and destination assets, and enter an amount",
        variant: "destructive",
      })
      return
    }

    if (!planId) {
      toast({
        title: "Plan ID Required",
        description: "Please enter a plan ID for cross-chain deposit",
        variant: "destructive",
      })
      return
    }

    if (!fromAssetDetails) {
      toast({
        title: "Invalid Asset",
        description: "Please select a valid source asset",
        variant: "destructive",
      })
      return
    }

    // Check if user is on the correct chain
    if (!isOnSourceChain) {
      toast({
        title: "Wrong Network",
        description: `Please switch to ${fromAssetDetails.chainName} to perform cross-chain deposit`,
        variant: "destructive",
      })
      return
    }

    if (chain?.id !== fromAssetDetails.chainId) {
      toast({
        title: "Chain Mismatch",
        description: `Please switch to ${fromAssetDetails.chainName} to use ${fromAssetDetails.symbol}`,
        variant: "destructive",
      })
      return
    }

    if (parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than 0",
        variant: "destructive",
      })
      return
    }

    try {
      // Convert amount to wei (assuming 18 decimals for native tokens, adjust if needed)
      const decimals = fromAssetDetails.symbol === "USDC" ? 6 : 18
      const amountWei = parseUnits(amount, decimals)

      // Check if user has enough balance
      if (amountWei > fromAssetDetails.rawBalance) {
        toast({
          title: "Insufficient Balance",
          description: `You don't have enough ${fromAssetDetails.symbol}. Available: ${fromAssetDetails.amount} ${fromAssetDetails.symbol}`,
          variant: "destructive",
        })
        return
      }

      if (!address) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet first",
          variant: "destructive",
        })
        return
      }

      // Call deposit function (assuming planId is a number)
      deposit(parseInt(planId), amountWei, address)

      toast({
        title: "Transaction Submitted",
        description: `Depositing ${amount} ${fromAssetDetails.symbol} to plan #${planId}`,
      })
    } catch (err: any) {
      toast({
        title: "Transaction Failed",
        description: err.message || "Failed to submit transaction",
        variant: "destructive",
      })
    }
  }

  // Reset form on success
  if (isSuccess) {
    setTimeout(() => {
      setFromAsset("")
      setToAsset("")
      setAmount("")
      setPlanId("")
      reset()
    }, 2000)
  }

  if (!isConnected) {
    return null
  }

  return (
    <div className="mt-6 p-4 rounded-xl border border-border/50 bg-muted/30">
      <h3 className="text-sm font-semibold text-foreground mb-4">Cross-Chain Transfer</h3>
      
      {/* Chain Status Warning */}
      {fromAssetDetails && needsChainSwitch && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                Switch Network Required
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Please switch to {fromAssetDetails.chainName} to use {fromAssetDetails.symbol}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSwitchChain}
            disabled={isSwitchingChain}
            size="sm"
            variant="outline"
            className="w-full mt-2"
          >
            {isSwitchingChain ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                Switching...
              </>
            ) : (
              `Switch to ${fromAssetDetails.chainName}`
            )}
          </Button>
        </div>
      )}

      {/* Current Chain Info */}
      {chain && (
        <div className="mb-4 p-2 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground">
            Current Network: <span className="font-medium text-foreground">{CHAIN_NAMES[chain.id] || chain.name}</span>
            {!isOnSourceChain && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                (Switch to Base Sepolia or ETH Sepolia for cross-chain deposit)
              </span>
            )}
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        {/* From Asset */}
        <div className="space-y-2">
          <Label htmlFor="from-asset" className="text-xs text-muted-foreground">
            From
          </Label>
          <Select value={fromAsset} onValueChange={setFromAsset}>
            <SelectTrigger id="from-asset" className="w-full">
              <SelectValue placeholder="Select source asset" />
            </SelectTrigger>
            <SelectContent>
              {availableAssets.length === 0 ? (
                <SelectItem value="no-assets" disabled>
                  No assets available
                </SelectItem>
              ) : (
                availableAssets.map((asset) => (
                  <SelectItem
                    key={`${asset.symbol}-${asset.chainId}`}
                    value={`${asset.symbol}-${asset.chainId}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full ${asset.color} flex items-center justify-center text-white text-xs font-bold`}
                      >
                        {asset.symbol.charAt(0)}
                      </div>
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground">({asset.chainName})</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {asset.amount}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* To Asset */}
        <div className="space-y-2">
          <Label htmlFor="to-asset" className="text-xs text-muted-foreground">
            To
          </Label>
          <Select value={toAsset} onValueChange={setToAsset}>
            <SelectTrigger id="to-asset" className="w-full">
              <SelectValue placeholder="Select destination asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.length === 0 ? (
                <SelectItem value="no-assets" disabled>
                  No assets available
                </SelectItem>
              ) : (
                assets.map((asset) => (
                  <SelectItem
                    key={`${asset.symbol}-${asset.chainId}`}
                    value={`${asset.symbol}-${asset.chainId}`}
                    disabled={fromAsset === `${asset.symbol}-${asset.chainId}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full ${asset.color} flex items-center justify-center text-white text-xs font-bold`}
                      >
                        {asset.symbol.charAt(0)}
                      </div>
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground">({asset.chainName})</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Amount
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="any"
              min="0"
              className="pr-16"
            />
            {fromAssetDetails && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {fromAssetDetails.symbol}
              </div>
            )}
          </div>
          {fromAssetDetails && (
            <p className="text-xs text-muted-foreground">
              Available: {fromAssetDetails.amount} {fromAssetDetails.symbol}
            </p>
          )}
        </div>

        {/* Plan Selection */}
        <div className="space-y-2">
          <Label htmlFor="plan-id" className="text-xs text-muted-foreground">
            Select Savings Plan
          </Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger id="plan-id" className="w-full">
              <SelectValue placeholder={isLoadingPlans ? "Loading plans..." : "Select a plan"} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingPlans ? (
                <SelectItem value="loading" disabled>
                  Loading plans...
                </SelectItem>
              ) : plans.length === 0 ? (
                <SelectItem value="no-plans" disabled>
                  No savings plans found. Create a plan first.
                </SelectItem>
              ) : (
                plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-sm">
                        Plan #{plan.id}: {plan.savingsGoal || "Untitled Plan"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.progress.toFixed(2)}% • {plan.token.symbol} • {plan.token.chainName}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedPlan && (
            <p className="text-xs text-muted-foreground">
              Current: {parseFloat(selectedPlan.currentAmount).toLocaleString()} {selectedPlan.token.symbol} / Target: {parseFloat(selectedPlan.targetAmount).toLocaleString()} {selectedPlan.token.symbol}
            </p>
          )}
        </div>

        {/* Confirm Button */}
        <Button
          onClick={handleConfirm}
          disabled={
            !fromAsset || 
            !toAsset || 
            !amount || 
            !planId || 
            isPending || 
            isConfirming || 
            isSwitchingChain ||
            needsChainSwitch ||
            !isOnSourceChain
          }
          className="w-full"
        >
          {isSwitchingChain ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Switching Network...
            </>
          ) : isPending || isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isConfirming ? "Confirming..." : "Processing..."}
            </>
          ) : needsChainSwitch ? (
            <>
              Switch Network First
            </>
          ) : (
            <>
              Confirm
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <p className="text-xs text-destructive mt-2">
            {error.message || "Transaction failed"}
          </p>
        )}

        {/* Success Message */}
        {isSuccess && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Transaction successful!
          </p>
        )}
      </div>
    </div>
  )
}
