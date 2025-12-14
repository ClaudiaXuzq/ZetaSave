import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Gift } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"

interface WalletConnectCardProps {
  onContinue?: () => void
}

export function WalletConnectCard({ onContinue }: WalletConnectCardProps) {
  const { isConnected, address } = useAccount()

  return (
    <Card className="w-full max-w-md shadow-lg border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 pt-8">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground text-balance leading-relaxed">
          Connect Your Wallet to Start Your Savings Journey
        </h2>
      </CardHeader>

      <CardContent className="px-6 py-6">
        <div className="space-y-4">
          {/* RainbowKit ConnectButton */}
          <div className="flex justify-center">
            <ConnectButton />
          </div>

          {isConnected && address && (
            <p className="text-center text-sm text-muted-foreground">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-8">
        <Button
          disabled={!isConnected}
          onClick={onContinue}
          className="w-full h-12 rounded-xl font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50"
        >
          <span className="mr-2">🎁</span>
          Continue
        </Button>
      </CardFooter>
    </Card>
  )
}
