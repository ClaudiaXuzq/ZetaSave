
import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Sparkles, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Welcome to ZetaSave! 🎄 I'm your AI savings assistant. I can help you optimize your cross-chain savings strategy, track rewards, and answer questions about your goals.",
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: "2",
    role: "user",
    content: "How much more do I need to save to reach my goal?",
    timestamp: new Date(Date.now() - 240000),
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Based on your current progress, you need approximately $2,150 more to reach your $10,000 vacation fund goal. At your current daily savings rate, you're on track to hit this in about 45 days!",
    timestamp: new Date(Date.now() - 180000),
  },
]

export function AiChatPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Great question! Let me analyze your savings data and get back to you with personalized recommendations. 🎅",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 1000)
  }

  return (
    <Card className="h-[calc(100vh-40px)] flex flex-col shadow-sm border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Powered by ZetaChain</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/30">
        {messages.map((message, index) => (
          <div key={message.id}>
            <div className={cn("flex gap-3 max-w-[90%]", message.role === "user" ? "ml-auto flex-row-reverse" : "")}>
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  message.role === "assistant"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {message.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  message.role === "assistant"
                    ? "bg-card text-card-foreground shadow-sm border border-border/30"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
            {index < messages.length - 1 && <div className="my-4 border-b border-border/30" />}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your savings..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary/30"
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
