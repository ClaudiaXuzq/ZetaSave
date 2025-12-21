import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Sparkles, Bot, User, Loader2, CheckCircle2, AlertCircle, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { ethers } from "ethers"
import { useQueryClient } from "@tanstack/react-query"
import { ZETASAVE_CONTRACT } from "@/config/contracts"
import ZetaSaveCrossChainABI from "@/abi/ZetaSaveCrossChain.json"

// 引入我们之前创建的思考组件
import ThinkingIndicator from "@/components/ThinkingIndicator"

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
  const queryClient = useQueryClient()
  
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
    const initialContext = location.state?.initialContext;
    if (initialContext && !hasInitialized.current) {
      hasInitialized.current = true;
      const { targetAmount, goalDate, purpose, notes } = initialContext;
      
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
  }, [location.state?.initialContext]);

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
      content: "Checking network and preparing the contract for your signature, sir. Please check your wallet. 🦊",
      timestamp: new Date(),
      type: "transaction_status",
      status: "pending"
    }]);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // 更新地址，以防用户中途切换了钱包
      setWalletAddress(signer.address); 
      
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

      // 重新获取 signer 以防网络切换后状态变更
      const currentSigner = await provider.getSigner();
      const contract = new ethers.Contract(
        ZETASAVE_CONTRACT.address,
        ZetaSaveCrossChainABI,
        currentSigner
      );

      // 1. 处理 token 地址 (确保格式正确)
      let tokenAddress = planData.token_address;
      const isNativeZETA = !tokenAddress || tokenAddress.length < 10 || tokenAddress === "ZETA";
      if (isNativeZETA) {
         tokenAddress = "0x0000000000000000000000000000000000000000";
      } else {
         tokenAddress = ethers.getAddress(tokenAddress);
      }

      // 2. 计算金额 (安全转换，防止精度报错)
      const amountStr = parseFloat(planData.amount_per_cycle).toFixed(18);
      const amountPerCycleWei = ethers.parseEther(amountStr);
      const targetAmountWei = amountPerCycleWei * 10n;

      // 象征性初始存款 (0.0001)
      const symbolicDeposit = ethers.parseEther("0.0001");

      // 3. 检查 Token 是否支持
      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: "Checking if token is supported... 🔍" }
        : m
      ));

      const isSupported = await contract.isTokenSupported(tokenAddress);
      if (!isSupported) {
        throw new Error(`Token ${tokenAddress} is not supported. Please contact admin.`);
      }

      const userAddress = await currentSigner.getAddress();

      // 4. 检查余额 (区分原生 ZETA 和 ZRC-20 token)
      if (isNativeZETA) {
        // 对于原生 ZETA，检查原生余额
        setMessages(prev => prev.map(m =>
          m.id === loadingMsgId
          ? { ...m, content: "Checking your native ZETA balance... 💰" }
          : m
        ));

        const balance = await provider.getBalance(userAddress);
        if (balance < symbolicDeposit) {
          throw new Error(`Insufficient native ZETA balance! Required: 0.0001 ZETA. Current balance: ${ethers.formatEther(balance)} ZETA`);
        }
      } else {
        // 对于 ZRC-20 token，检查 token 余额并授权
        setMessages(prev => prev.map(m =>
          m.id === loadingMsgId
          ? { ...m, content: "Checking your ZRC-20 token balance... 💰" }
          : m
        ));

        const ERC20_ABI = [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function balanceOf(address account) public view returns (uint256)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, currentSigner);
        const balance = await tokenContract.balanceOf(userAddress);

        if (balance < symbolicDeposit) {
          throw new Error(`Insufficient ZRC-20 balance! Required: 0.0001 token.`);
        }

        // 5. 核心步骤：授权 (Approve) - 仅对 ZRC-20 token
        setMessages(prev => prev.map(m =>
          m.id === loadingMsgId
          ? { ...m, content: "Balance sufficient! Approving ZRC-20 token... Please confirm in MetaMask. 🦊" }
          : m
        ));

        const approveTx = await tokenContract.approve(
          ZETASAVE_CONTRACT.address,
          symbolicDeposit
        );
        console.log("Approve transaction sent:", approveTx.hash);
        await approveTx.wait();
      }

      // 6. 发起创建计划交易
      setMessages(prev => prev.map(m =>
        m.id === loadingMsgId
        ? { ...m, content: isNativeZETA ? "Creating savings plan with native ZETA... 🦊" : "Token approved! Creating savings plan... 🦊" }
        : m
      ));

      console.log("Creating plan with createPlanDirect:", {
        zrc20: tokenAddress,
        targetAmount: targetAmountWei.toString(),
        savingsGoal: planData.savings_goal,
        initialDeposit: symbolicDeposit.toString(),
        isNativeZETA
      });

      // 注意: createPlanDirect 是 nonpayable，合约内部会处理原生 ZETA 转账
      const tx = await contract.createPlanDirect(
        tokenAddress,
        targetAmountWei,
        planData.savings_goal,
        symbolicDeposit  // 象征性初始存款
      );

      console.log("Transaction sent:", tx.hash);

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

      // Invalidate all queries and wait a bit for the transaction to be indexed
      queryClient.invalidateQueries()
      
      // Refetch after delays to ensure we get the updated data
      setTimeout(() => {
        queryClient.invalidateQueries()
      }, 2000)
      
      setTimeout(() => {
        queryClient.invalidateQueries()
      }, 5000)

      setMessages(prev => prev.map(m => 
        m.id === loadingMsgId 
        ? { 
            ...m, 
            content: `✅ Splendid! The plan is now immutable on the blockchain.
Reference: ${tx.hash.slice(0, 10)}...

A symbolic deposit of 0.0001 token has been made to initialize your plan.
You can now manage deposits and withdrawals in the Dashboard.`, 
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
            content: `❌ I'm afraid the transaction failed, sir: ${error.reason || error.message || "User rejected or network error"}`, 
            status: "error" 
          }
        : m
      ));
    }
  }

  return (
    <Card className="h-[calc(100vh-40px)] flex flex-col shadow-sm border-border/50 rounded-2xl bg-card">
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