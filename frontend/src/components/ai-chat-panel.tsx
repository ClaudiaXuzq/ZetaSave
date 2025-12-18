import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom" // 引入路由钩子
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Sparkles, Bot, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ethers } from "ethers"
import { ZETASAVE_CONTRACT } from "@/config/contracts"
import ZetaSaveCrossChainABI from "@/abi/ZetaSaveCrossChain.json"

// ZetaChain Athens Testnet 配置
const ZETACHAIN_ATHENS = {
  chainId: 7001,
  chainIdHex: "0x1b59",
  chainName: "ZetaChain Athens Testnet",
  rpcUrls: ["https://zetachain-athens-evm.blockpi.network/v1/rpc/public"],
  nativeCurrency: { name: "ZETA", symbol: "ZETA", decimals: 18 },
  blockExplorerUrls: ["https://athens.explorer.zetachain.com"],
};

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
  
  // 🆕 新增：处理路由传参
  const location = useLocation()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // 🆕 新增：自动处理从首页传来的表单数据
  useEffect(() => {
    // 检查是否有 initialContext，并且确保只执行一次 (hasInitialized)
    if (location.state?.initialContext && !hasInitialized.current) {
      hasInitialized.current = true;
      const { targetAmount, goalDate, purpose, notes } = location.state.initialContext;
      
      console.log("🚀 Received context from form:", location.state.initialContext);

      // 构造一个详细的 Prompt 给 AI
      // 这里我们把 notes 也加上，让 AI 知道更多细节
      const prompt = `I want to create a savings plan. 
      Goal Purpose: ${purpose}. 
      Target Amount: ${targetAmount}. 
      Deadline: ${goalDate}. 
      Additional Notes: ${notes}.
      Please create a savings plan based on this.`;

      // 1. 先在界面上显示一条“用户消息”，让用户知道数据已同步
      const autoUserMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `🎯 I've set my goal: Save ${targetAmount} for ${purpose} by ${goalDate}.`,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, autoUserMessage]);

      // 2. 自动调用 AI (复用 handleSend 的逻辑，但需要微调)
      triggerAiResponse(prompt, autoUserMessage);
    }
  }, [location.state]); // 依赖 location.state

  // 独立的 AI 调用函数，供 handleSend 和 useEffect 复用
  const triggerAiResponse = async (userText: string, userMsgContext?: Message) => {
    setIsLoading(true);
    
    // 如果没有传入 context (说明是 useEffect 调用的)，我们需要把 history 传准
    // 注意：这里的 history 应该包含刚发的那条 userMsgContext
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
          wallet_address: "0x0000000000000000000000000000000000000000",
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
    
    // 调用封装好的函数
    await triggerAiResponse(userText, userMessage);
  }

  const handleConfirmPlan = async (planData: any) => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const loadingMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: loadingMsgId,
      role: "assistant",
      content: "Checking network and preparing transaction... 🦊",
      timestamp: new Date(),
      type: "transaction_status",
      status: "pending"
    }]);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 检查并切换到 ZetaChain Athens Testnet
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== ZETACHAIN_ATHENS.chainId) {
        setMessages(prev => prev.map(m =>
          m.id === loadingMsgId
          ? { ...m, content: "Switching to ZetaChain Athens Testnet... 🔄" }
          : m
        ));

        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ZETACHAIN_ATHENS.chainIdHex }],
          });
        } catch (switchError: any) {
          // 如果网络不存在，添加它
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: ZETACHAIN_ATHENS.chainIdHex,
                chainName: ZETACHAIN_ATHENS.chainName,
                rpcUrls: ZETACHAIN_ATHENS.rpcUrls,
                nativeCurrency: ZETACHAIN_ATHENS.nativeCurrency,
                blockExplorerUrls: ZETACHAIN_ATHENS.blockExplorerUrls,
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: "Requesting signature in MetaMask... Please confirm the transaction. 🦊" }
        : m
      ));

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        ZETASAVE_CONTRACT.address,
        ZetaSaveCrossChainABI,
        signer
      );

      // 处理 token 地址
      let tokenAddress = planData.token_address;
      if (!tokenAddress || tokenAddress.length < 10 || tokenAddress === "ZETA") {
         tokenAddress = "0x0000000000000000000000000000000000000000";
      } else {
         tokenAddress = ethers.getAddress(tokenAddress);
      }

      // 计算目标金额 (amount_per_cycle * 10 作为总目标)
      // 截断到最多 18 位小数，避免 ethers.parseEther 报错
      const amountStr = parseFloat(planData.amount_per_cycle).toFixed(18);
      const amountPerCycleWei = ethers.parseEther(amountStr);
      const targetAmountWei = amountPerCycleWei * 10n;

      // 使用象征性的初始存款（0.0001 token），用户稍后可以在 Dashboard 进行真正的存款
      const symbolicDeposit = ethers.parseEther("0.0001");

      // 检查 token 是否被合约支持
      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: "Checking if token is supported... 🔍" }
        : m
      ));

      const isSupported = await contract.isTokenSupported(tokenAddress);
      if (!isSupported) {
        throw new Error(
          `Token ${tokenAddress} is not supported by the contract. ` +
          `The contract owner needs to call addSupportedToken() first. ` +
          `Please contact the administrator or run the registerTokens script.`
        );
      }

      // ERC-20 ABI (需要 approve 和 balanceOf 函数)
      const ERC20_ABI = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function balanceOf(address account) public view returns (uint256)"
      ];

      // 创建 token 合约实例
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      // 检查用户的 ZRC-20 余额
      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: "Checking your ZRC-20 token balance... 💰" }
        : m
      ));

      const userAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(userAddress);

      if (balance < symbolicDeposit) {
        throw new Error(
          `Insufficient ZRC-20 token balance!\n\n` +
          `Required: ${ethers.formatEther(symbolicDeposit)} tokens\n` +
          `Your balance: ${ethers.formatEther(balance)} tokens\n\n` +
          `Please get ZRC-20 tokens from the faucet:\n` +
          `🌐 https://labs.zetachain.com/get-zeta`
        );
      }

      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: "Balance sufficient! Approving ZRC-20 token... Please confirm in MetaMask. 🦊" }
        : m
      ));

      // 步骤 1: Approve ZRC-20 token
      const approveTx = await tokenContract.approve(
        ZETASAVE_CONTRACT.address,
        symbolicDeposit
      );

      console.log("Approve transaction sent:", approveTx.hash);
      await approveTx.wait();

      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: "Token approved! Creating savings plan... 🦊" }
        : m
      ));

      console.log("Creating plan with createPlanDirect:", {
        zrc20: tokenAddress,
        targetAmount: targetAmountWei.toString(),
        savingsGoal: planData.savings_goal,
        initialDeposit: symbolicDeposit.toString()
      });

      // 步骤 2: 调用 createPlanDirect (无需 value 参数，因为是 ERC-20)
      const tx = await contract.createPlanDirect(
        tokenAddress,
        targetAmountWei,
        planData.savings_goal,
        symbolicDeposit  // 象征性初始存款
      );

      console.log("Transaction sent:", tx.hash);

      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: `Transaction sent! Waiting for confirmation... ⏳\nHash: ${tx.hash.slice(0, 10)}...`, status: "pending" }
        : m
      ));

      await tx.wait();

      await fetch("http://127.0.0.1:8000/api/create-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });

      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? {
            ...m,
            content: `✅ Plan successfully created on-chain! \n\nA symbolic deposit of 0.0001 token has been made to initialize your plan.\n\nYou can now manage deposits and withdrawals in the Dashboard.`,
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
