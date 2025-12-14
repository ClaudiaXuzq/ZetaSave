"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Wallet, Gift, Check } from "lucide-react"

interface WalletConnectCardProps {
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function WalletConnectCard({ isConnected, onConnect, onDisconnect }: WalletConnectCardProps) {
  return (
    <Card className="w-full max-w-md shadow-lg border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 pt-8">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground text-balance leading-relaxed">
          Connect Your Wallet to Start Your Christmas Savings Journey
        </h2>
      </CardHeader>

      <CardContent className="px-6 py-6">
        <div className="space-y-4">
          {/* RainbowKit ConnectButton Placeholder */}
          <Button
            onClick={isConnected ? onDisconnect : onConnect}
            variant={isConnected ? "outline" : "default"}
            className="w-full h-12 rounded-xl gap-2 font-medium"
          >
            {isConnected ? (
              <>
                <Check className="w-4 h-4" />
                Wallet Connected
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Connect MetaMask via RainbowKit
              </>
            )}
          </Button>

          {isConnected && <p className="text-center text-sm text-muted-foreground">🎅 Connected: 0x1234...5678</p>}
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-8">
        <Button
          disabled={!isConnected}
          className="w-full h-12 rounded-xl font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground disabled:opacity-50"
        >
          <span className="mr-2">🎁</span>
          Continue
        </Button>
      </CardFooter>
    </Card>
  )
}
