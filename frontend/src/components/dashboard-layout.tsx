import { AiChatPanel } from "@/components/ai-chat-panel"
import { SavingsDashboard } from "@/components/savings-dashboard"
import { ConnectButton } from "@rainbow-me/rainbowkit"

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background font-merriweather">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoV4.svg" alt="ZetaSave Logo" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%) invert(13%) sepia(89%) saturate(3034%) hue-rotate(344deg) brightness(95%) contrast(95%)' }} />
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'rgb(139, 26, 26)' }}>ZetaSave</h1>
              <p className="text-xs text-muted-foreground">Cross-chain savings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
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
