import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Sparkles, Bot, User, Loader2, CheckCircle2, AlertCircle, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { ethers } from "ethers"

// 引入我们之前创建的思考组件
import ThinkingIndicator from "@/components/ThinkingIndicator"

// 替换成你的真实合约地址
const CONTRACT_ADDRESS = "0x3E0c67B0dB328BFE75d68b5236fD234E01E8788b";

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

// 快捷指令
const SUGGESTIONS = [
  "💰 Check my Balance",
  "📈 Risk Assessment",
  "🎯 Review Goals",
  "🤔 Nudge me"
];

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Welcome, Master Wayne. 🎄 I am Alfred, your ZetaSave asset manager. \n\nHow may I assist you in securing your legacy today?",
    timestamp: new Date(Date.now() - 300000),
    type: "text",
  },
]

export function AiChatPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState("0xUnknown") // 🆕 存储钱包地址
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const location = useLocation()
  const hasInitialized = useRef(false)

  // 1. 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // 2. 🆕 初始化：获取钱包地址
  useEffect(() => {
    const connectWalletSilent = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setWalletAddress(accounts[0].address);
            console.log("👛 Wallet connected for AI Context:", accounts[0].address);
          }
        } catch (e) {
          console.log("Wallet not connected yet");
        }
      }
    };
    connectWalletSilent();
  }, []);

  // 3. 处理路由传参 (StartingPage 跳转过来的数据)
  useEffect(() => {
    if (location.state?.initialContext && !hasInitialized.current) {
      hasInitialized.current = true;
      const { targetAmount, goalDate, purpose, notes } = location.state.initialContext;
      
      const prompt = `I want to create a savings plan. 
      Goal Purpose: ${purpose}. 
      Target Amount: ${targetAmount}. 
      Deadline: ${goalDate}. 
      Additional Notes: ${notes}.
      Please create a savings plan based on this.`;

      const autoUserMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `🎯 I've set my goal: Save ${targetAmount} for ${purpose} by ${goalDate}.`,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, autoUserMessage]);

      triggerAiResponse(prompt, autoUserMessage);
    }
  }, [location.state]);

  // 4. 核心：触发 AI 回复
  const triggerAiResponse = async (userText: string, userMsgContext?: Message) => {
    setIsLoading(true);
    
    const currentHistory = userMsgContext 
        ? [...messages, userMsgContext].map(m => ({ role: m.role, content: m.content }))
        : messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch("http://127.0.0.1:8000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: currentHistory,
          wallet_address: walletAddress, // 🆕 传入真实的钱包地址！
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
        content: "My apologies, sir. The secure line to the Batcomputer seems to be down. (Backend Error)",
        timestamp: new Date(),
        type: "text",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // 发送消息
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input.trim();
    if (!textToSend || isLoading) return
    
    setInput("")

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
      type: "text",
    }
    setMessages((prev) => [...prev, userMessage])
    
    await triggerAiResponse(textToSend, userMessage);
  }

  // 确认计划并上链
  const handleConfirmPlan = async (planData: any) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const loadingMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: loadingMsgId,
      role: "assistant",
      content: "Preparing the contract for your signature, sir. Please check your wallet. 🦊",
      timestamp: new Date(),
      type: "transaction_status",
      status: "pending"
    }]);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // 更新地址，以防用户中途切换了钱包
      setWalletAddress(signer.address); 
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let tokenAddress = planData.token_address;
      if (!tokenAddress || tokenAddress.length < 10 || tokenAddress === "ZETA") {
         tokenAddress = "0x0000000000000000000000000000000000000000"; 
      }

      const amountPerCycleWei = ethers.parseEther(planData.amount_per_cycle.toString());
      const targetAmountWei = amountPerCycleWei * 10n; // 简化逻辑：假设总目标是单期的10倍，或根据实际 planData.target_amount 转换
      
      const tx = await contract.createSavingsPlan(
        tokenAddress,
        targetAmountWei,
        amountPerCycleWei,
        BigInt(planData.cycle_frequency_seconds),
        planData.savings_goal
      );

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId 
        ? { ...m, content: `Transaction broadcasted. Awaiting confirmation... ⏳\nTx: ${tx.hash.slice(0, 10)}...`, status: "pending" } 
        : m
      ));

      await tx.wait();

      // 通知后端入库
      await fetch("http://127.0.0.1:8000/api/create-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId 
        ? { 
            ...m, 
            content: `✅ Splendid! The plan is now immutable on the blockchain.\nReference: ${tx.hash.slice(0, 10)}...`, 
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
            content: `❌ I'm afraid the transaction failed, sir: ${error.reason || "User rejected or network error"}`, 
            status: "error" 
          } 
        : m
      ));
    }
  }

 return (
    <Card className="h-[calc(100vh-40px)] flex flex-col shadow-none border-0 bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center relative border border-border">
          <Bot className="w-5 h-5 text-foreground" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Alfred</h2>
          <div className="flex items-center gap-1.5">
             <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Asset Manager</span>
             {walletAddress !== "0xUnknown" && (
               <span className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full font-medium">
                  <Wallet className="w-3 h-3" /> Connected
               </span>
             )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={cn("flex gap-3 max-w-[90%]", message.role === "user" ? "ml-auto flex-row-reverse" : "")}>
              
              {/* Avatar */}
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", 
                  message.role === "assistant" ? "bg-muted border-border text-foreground" : "bg-primary text-primary-foreground border-primary")}>
                {message.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Bubble - 使用标准语义类，确保字体清晰 */}
              <div className={cn("px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm", 
                  message.role === "assistant" 
                    ? "bg-muted text-foreground border border-border rounded-tl-none" 
                    : "bg-primary text-primary-foreground rounded-tr-none")}>
                {message.content}
              </div>
            </div>

            {/* 📜 Plan Confirmation Card */}
            {message.type === "plan_confirmation" && message.planData && (
              <div className="ml-11 max-w-[85%] md:max-w-[70%]">
                <Card className="p-0 overflow-hidden border-border shadow-sm">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary"/> 
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Proposal Draft</span>
                  </div>
                  <div className="p-4 space-y-3 bg-card">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="font-medium text-foreground">{message.planData.savings_goal}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Deposit / Cycle</span>
                        <span className="font-mono font-bold text-primary">{message.planData.amount_per_cycle} ZETA</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">Frequency</span>
                        <span className="text-foreground">{message.planData.cycle_frequency_seconds}s</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full font-medium"
                      onClick={() => handleConfirmPlan(message.planData)}
                    >
                      Sign & Deploy
                    </Button>
                  </div>
                </Card>
              </div>
            )}
            
            {/* 🦊 Transaction Status Card */}
            {message.type === "transaction_status" && (
               <div className="ml-11 max-w-[80%]">
                 <div className={cn("p-3 rounded-lg border flex items-center gap-3 text-xs shadow-sm bg-background", 
                    message.status === "pending" ? "border-yellow-500/30 text-yellow-600" : 
                    message.status === "success" ? "border-green-500/30 text-green-600" : "border-red-500/30 text-red-600")}>
                    
                    {message.status === "pending" && <Loader2 className="w-4 h-4 animate-spin"/>}
                    {message.status === "success" && <CheckCircle2 className="w-4 h-4"/>}
                    {message.status === "error" && <AlertCircle className="w-4 h-4"/>}
                    
                    <div className="flex flex-col">
                      <span className="font-semibold uppercase tracking-wider">
                        {message.status === "pending" ? "Executing..." : 
                         message.status === "success" ? "Confirmed" : "Failed"}
                      </span>
                      <span className="opacity-90 truncate max-w-[200px] text-muted-foreground">{message.content}</span>
                    </div>
                 </div>
               </div>
            )}

          </div>
        ))}
        
        {/* 🧠 Thinking Indicator */}
        {isLoading && <ThinkingIndicator />}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        
        {/* Suggestion Chips */}
        {!isLoading && messages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {SUGGESTIONS.map((s) => (
                <button 
                  key={s} 
                  onClick={() => handleSend(s)}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Tell Alfred your wish..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
            className="flex-1 bg-background text-foreground placeholder:text-muted-foreground border-input focus-visible:ring-primary"
          />
          <Button onClick={() => handleSend()} disabled={isLoading} size="icon" className="shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}