import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Snowflake } from "lucide-react"

export default function StartingPage() {
  const navigate = useNavigate()
  const [targetAmount, setTargetAmount] = useState("")
  const [goalDate, setGoalDate] = useState("")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")

  const handleStartSaving = () => {
    console.log("Starting savings plan:", {
      targetAmount,
      goalDate,
      purpose,
      notes,
    })
    navigate("/dashboard")
  }

  const handleConnectWallet = () => {
    console.log("Connecting wallet...")
    navigate("/wallet")
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Merriweather', serif" }}>
      {/* Snowflakes decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Snowflake className="absolute top-[10%] left-[5%] text-primary/10 w-8 h-8 animate-pulse" />
        <Snowflake className="absolute top-[20%] right-[10%] text-secondary/10 w-6 h-6 animate-pulse delay-300" />
        <Snowflake className="absolute top-[60%] left-[15%] text-primary/10 w-7 h-7 animate-pulse delay-700" />
        <Snowflake className="absolute top-[70%] right-[20%] text-secondary/10 w-5 h-5 animate-pulse delay-500" />
        <Snowflake className="absolute top-[40%] right-[5%] text-primary/10 w-6 h-6 animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoV4.svg" alt="ZetaSave Logo" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(13%) sepia(89%) saturate(3034%) hue-rotate(344deg) brightness(95%) contrast(95%)' }} />
            <h1 className="text-xl font-semibold" style={{ color: 'rgb(139, 26, 26)' }}>ZetaSave</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleConnectWallet}>
            Connect MetaMask Wallet
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary mb-4">
            <Snowflake className="w-4 h-4" />
            <span>Save Smarter This Holiday Season</span>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-6">
            <img src="/logoV4.svg" alt="ZetaSave Logo" className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48" style={{ filter: 'brightness(0) saturate(100%) invert(13%) sepia(89%) saturate(3034%) hue-rotate(344deg) brightness(95%) contrast(95%)' }} />
            <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground text-balance leading-tight">
              <span style={{ color: 'rgb(139, 26, 26)' }}>ZetaSave</span>
            </h2>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            Your Cross-Chain Savings Journey Starts Here
          </p>
        </div>
      </section>

      {/* Savings Form Card */}
      <section className="container mx-auto px-4 pb-24">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Create Your Savings Plan</CardTitle>
            <CardDescription>Set your goals and start building your financial future today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="target-amount">Target Amount</Label>
              <Input
                id="target-amount"
                type="number"
                placeholder="Enter amount (e.g., 5000)"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-date">Time to Reach Goal</Label>
              <Input
                id="goal-date"
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Saving Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger id="purpose" className="text-base">
                  <SelectValue placeholder="Select your savings goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="christmas-travel">Christmas Travel</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="loan-repayment">Loan Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional details about your savings plan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] text-base resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleStartSaving} className="flex-1 text-base h-11" size="lg">
                Start Saving Plan
              </Button>
              <Button onClick={handleConnectWallet} variant="outline" className="flex-1 text-base h-11" size="lg">
                Connect MetaMsk Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer decorative element */}
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground">
          <p>Powered by ZetaChain · Secure Cross-Chain Savings</p>
        </div>
      </div>
    </div>
  )
}

