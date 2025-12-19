// frontend/components/ThinkingIndicator.tsx

import { useState, useEffect } from "react";

// 🎩 Alfred 的思考台词库
const THINKING_PHRASES = [
  "Reviewing your ledger...",           // 正在查阅账本
  "Calculating risk metrics...",        // 正在计算风险指标
  "Consulting the archives...",         // 正在查阅档案
  "Drafting the proposal...",           // 正在起草提案
  "Analyzing market volatility...",     // 正在分析市场波动
  "Preparing your financial report...", // 正在准备财务报告
  "Just a moment, Master Wayne...",     // 请稍等，韦恩少爷
];

export default function ThinkingIndicator() {
  const [phrase, setPhrase] = useState(THINKING_PHRASES[0]);

  useEffect(() => {
    // 每次组件出现时，随机选一句话
    const randomPhrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    setPhrase(randomPhrase);

    // 可选：如果你希望它在长时间等待中每隔3秒换一句话，可以把下面这行解开
    /*
    const interval = setInterval(() => {
       setPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    }, 3000);
    return () => clearInterval(interval);
    */
  }, []);

  return (
    <div className="flex items-start gap-3 my-4 animate-fade-in">
      {/* 头像部分 - 保持和 AI 消息一致 */}
      <div className="w-8 h-8 rounded-full bg-yellow-900/50 flex items-center justify-center border border-yellow-700/50">
        <span className="text-sm">🧐</span>
      </div>

      <div className="flex flex-col gap-1">
        {/* 名字 */}
        <span className="text-xs font-bold text-yellow-600/80 uppercase tracking-wider ml-1">
          Alfred
        </span>
        
        {/* 气泡 */}
        <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-gray-800/50 border border-gray-700/50 text-gray-400 text-sm font-serif italic flex items-center gap-2">
          
          {/* 动画小点点 */}
          <div className="flex gap-1 mr-1">
            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce"></span>
          </div>

          <span>{phrase}</span>
        </div>
      </div>
    </div>
  );
}