"use client"

import { AiChatPanel } from "@/components/ai-chat-panel"
import { SavingsDashboard } from "@/components/savings-dashboard"
import { Snowflake } from "lucide-react"

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">ZetaSave</h1>
              <p className="text-xs text-muted-foreground">Cross-chain savings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              0x1234...5678
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - AI Chat */}
          <div className="lg:col-span-5 xl:col-span-4">
            <AiChatPanel />
          </div>

          {/* Right Column - Savings Dashboard */}
          <div className="lg:col-span-7 xl:col-span-8">
            <SavingsDashboard />
          </div>
        </div>
      </main>
    </div>
  )
}
