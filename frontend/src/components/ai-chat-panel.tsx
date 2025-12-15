import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Sparkles, Bot, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ethers } from "ethers"

// 替换成你的真实合约地址
const CONTRACT_ADDRESS = "0x3E0c67B0dB328BFE75d68b5236fD234E01E8788b";

// 这是一个简化的 ABI，只包含我们需要用的函数
const CONTRACT_ABI = [
  "function createSavingsPlan(address tokenAddress, uint256 targetAmount, uint256 amountPerCycle, uint256 cycleFrequency, string savingsGoal) public returns (uint256)",
  "event PlanCreated(address indexed user, uint256 planId, uint256 targetAmount, address tokenAddress)"
];

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: "text" | "plan_confirmation" | "transaction_status"
  planData?: any
  txHash?: string
  status?: "pending" | "success" | "error"
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Welcome to ZetaSave! 🎄 I'm your AI savings assistant. Tell me your goal (e.g., 'Save 100 USDT for a trip'), and I'll help you create a smart savings plan!",
    timestamp: new Date(Date.now() - 300000),
    type: "text",
  },
]

export function AiChatPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userText = input.trim()
    setInput("")

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
      type: "text",
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch("http://127.0.0.1:8000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          wallet_address: "0x0000000000000000000000000000000000000000", // 占位
        }),
      })

      if (!response.ok) throw new Error("Network response was not ok")
      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        type: data.type === "plan" ? "plan_confirmation" : "text",
        planData: data.plan_data,
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("AI Chat Error:", error)
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I couldn't reach the server. Is the backend running? 🔌",
        timestamp: new Date(),
        type: "text",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // 🚀 核心修改：连接钱包并调用 createSavingsPlan
  const handleConfirmPlan = async (planData: any) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const loadingMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: loadingMsgId,
      role: "assistant",
      content: "Requesting signature in MetaMask... Please confirm the transaction. 🦊",
      timestamp: new Date(),
      type: "transaction_status",
      status: "pending"
    }]);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // 1. 处理代币地址 (如果是 "ZETA" 或空，使用零地址)
      // 注意：你的 AI 可能会返回具体的代币地址，这里做个简单处理
      let tokenAddress = planData.token_address;
      if (!tokenAddress || tokenAddress.length < 10 || tokenAddress === "ZETA") {
         tokenAddress = "0x0000000000000000000000000000000000000000"; // 原生代币标识
      }

      // 2. 转换数值为 Wei
      // 假设 AI 返回的数值是 "100" (ether单位)，我们需要转成 Wei
      // 如果你的 createPlan 想要 totalAmount，这里需要 AI 计算好，或者我们在前端算
      // 这里假设 planData.savings_goal 是字符串描述
      // 注意：API 里 createSavingsPlan 需要 targetAmount (总目标)
      // 我们暂定 targetAmount = amountPerCycle * 10 (假设存10期)，或者你可以让 AI 传这个值
      // 为了跑通，我先用 amountPerCycle 作为 targetAmount 的基础
      const amountPerCycleWei = ethers.parseEther(planData.amount_per_cycle.toString());
      const targetAmountWei = amountPerCycleWei * 10n; // 默认目标是每次存额的10倍，可以改
      
      console.log("Creating plan with:", {
        token: tokenAddress,
        target: targetAmountWei.toString(),
        perCycle: amountPerCycleWei.toString(),
        freq: planData.cycle_frequency_seconds,
        goal: planData.savings_goal
      });

      // 3. 发送交易
      // function createSavingsPlan(token, target, perCycle, frequency, goal)
      const tx = await contract.createSavingsPlan(
        tokenAddress,
        targetAmountWei,
        amountPerCycleWei,
        BigInt(planData.cycle_frequency_seconds),
        planData.savings_goal
      );

      console.log("Transaction sent:", tx.hash);

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId 
        ? { ...m, content: `Transaction sent! Waiting for confirmation... ⏳\nHash: ${tx.hash.slice(0, 10)}...`, status: "pending" } 
        : m
      ));

      await tx.wait();

      // 4. 成功后同步给后端（可选）
      await fetch("http://127.0.0.1:8000/api/create-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId 
        ? { 
            ...m, 
            content: `✅ Plan successfully created on-chain! \nYou can now make your first deposit using the dashboard.`, 
            status: "success",
            txHash: tx.hash
          } 
        : m
      ));

    } catch (error: any) {
      console.error("Transaction failed:", error);
      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId 
        ? { 
            ...m, 
            content: `❌ Transaction failed: ${error.reason || error.message || "Unknown error"}`, 
            status: "error" 
          } 
        : m
      ));
    }
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
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className={cn("flex gap-3 max-w-[90%]", message.role === "user" ? "ml-auto flex-row-reverse" : "")}>
              
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", 
                  message.role === "assistant" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary")}>
                {message.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap", 
                  message.role === "assistant" ? "bg-card text-card-foreground shadow-sm border border-border/30" : "bg-primary text-primary-foreground")}>
                {message.content}
              </div>
            </div>

            {/* Plan Confirmation Card */}
            {message.type === "plan_confirmation" && message.planData && (
              <div className="ml-11 max-w-[80%]">
                <Card className="p-4 border-primary/20 bg-primary/5">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500"/> Plan Ready
                  </h3>
                  <div className="text-sm space-y-1 mb-3 text-muted-foreground">
                    <p>🎯 Goal: <span className="text-foreground">{message.planData.savings_goal}</span></p>
                    <p>💰 Amount: <span className="text-foreground">{message.planData.amount_per_cycle} ZETA</span></p>
                    <p>⏱ Frequency: <span className="text-foreground">{message.planData.cycle_frequency_seconds} seconds</span></p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleConfirmPlan(message.planData)}
                  >
                    Confirm & Sign on Chain
                  </Button>
                </Card>
              </div>
            )}
            
            {/* Transaction Status Card */}
            {message.type === "transaction_status" && (
               <div className="ml-11 max-w-[80%]">
                 <Card className={cn("p-3 border", 
                    message.status === "pending" ? "border-yellow-200 bg-yellow-50" : 
                    message.status === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
                    <div className="flex items-center gap-2 text-xs">
                       {message.status === "pending" && <Loader2 className="w-3 h-3 animate-spin text-yellow-600"/>}
                       {message.status === "success" && <CheckCircle2 className="w-3 h-3 text-green-600"/>}
                       {message.status === "error" && <AlertCircle className="w-3 h-3 text-red-600"/>}
                       <span className="font-medium">
                         {message.status === "pending" ? "Processing Transaction..." : 
                          message.status === "success" ? "Transaction Confirmed!" : "Transaction Failed"}
                       </span>
                    </div>
                 </Card>
               </div>
            )}

          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 max-w-[90%]">
             <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0"><Bot className="w-4 h-4" /></div>
             <div className="px-4 py-3 bg-card rounded-2xl border border-border/30 flex items-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Thinking...</span>
             </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/50 bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Type your goal..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary/30"
          />
          <Button onClick={handleSend} disabled={isLoading} size="icon" className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}
