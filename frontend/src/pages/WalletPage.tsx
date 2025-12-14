import { useNavigate } from "react-router-dom"
import { WalletConnectCard } from "@/components/wallet-connect-card"

export default function WalletPage() {
  const navigate = useNavigate()

  const handleContinue = () => {
    navigate("/")
  }

  return (
    <main className="min-h-screen bg-background font-merriweather">
      {/* Festive Header */}
      <header className="w-full py-6 px-8 flex items-center justify-center gap-3">
        <span className="text-2xl">🎄</span>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">ZetaSave</h1>
        <span className="text-2xl">💰</span>
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 pt-16 pb-24">
        <WalletConnectCard onContinue={handleContinue} />
      </div>
    </main>
  )
}

