# backend/ai_module/agent.py

import os
import time
import json
import requests
import httpx
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# -------------------------------------------------------------------------
#  网络连接配置 (直连模式 - 无代理)
# -------------------------------------------------------------------------

# 1. 配置 HTTP 客户端 (仅设置超时，不走代理)
custom_http_client = httpx.Client(
    timeout=60.0
)

# 2. 读取 Qwen 的配置
client = OpenAI(
    api_key=os.getenv("QWEN_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    http_client=custom_http_client,  # 使用无代理的客户端
    max_retries=2
)

BACKEND_URL = "http://127.0.0.1:8000/api/create-plan"


# --- 1. 旧功能：单次生成 (保留以兼容) ---
def generate_savings_plan(user_input: str) -> dict:
    """
    [Legacy] 调用 Qwen 生成个性化储蓄计划（JSON）
    """
    print("🤖 Qwen 正在生成储蓄计划 (One-shot)...")

    system_prompt = f"""
你是一个个性化储蓄规划助手，需要根据用户的自然语言描述，生成一个严格的 JSON 对象，用于写入智能合约后端。

【必须输出的 JSON 结构】：
{{
  "user_wallet_address": "用户的钱包地址（如果没提到，就填 '0xUnknown'）",
  "savings_goal": "简短的目标名称，例如 '买 MacBook Pro'",
  "token_address": "0x5F04bbc4d96b5cffc2363e472090F3A8344E4e56",
  "amount_per_cycle": "每次建议存入的金额，字符串形式，例如 '50.00'",
  "cycle_frequency_seconds": 604800,
  "start_time_timestamp": {int(time.time())},
  "risk_strategy": "conservative 或 aggressive",
  "nudge_enabled": true
}}

【要求】：
1. 严格返回一个 JSON 对象，不能有注释、中文说明或 Markdown。
2. 字段名必须和上面的结构一致。
"""

    try:
        resp = client.chat.completions.create(
            model="qwen-plus",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            response_format={"type": "json_object"}
        )

        content = resp.choices[0].message.content
        print("✨ Qwen 原始输出:", content)
        data = json.loads(content)
        return data
    except Exception as e:
        print("❌ 生成计划失败:", e)
        return {}


# -------------------------------------------------------------------------
#  AI 角色设定：阿尔弗雷德 (Alfred) - 韦恩庄园管家风格
# -------------------------------------------------------------------------
# [修改] 在 Prompt 中增加了 {chain_context} 占位符
CHAT_SYSTEM_PROMPT = f"""
**角色设定**：
你不是普通的机器人，你是 "Alfred"（阿尔弗雷德），一位服务于韦恩家族的资深英式管家。
你的用户是 "Master Wayne"（韦恩少爷/老爷），也就是你需要服务的对象。

**说话风格**：
- 极其绅士、礼貌、沉稳，使用敬语（如 "Sir", "Master", "为您效劳"）。
- 带有淡淡的英式幽默或自嘲，但绝不冒犯。
- 在谈论金钱时，保持专业、严谨，像在管理韦恩企业的资产一样。
- 只有在真正需要生成计划数据时，才会展现出数据处理的高效一面。

**你的任务**：
通过优雅的对话，收集制定储蓄计划所需的4个关键信息，最后生成 JSON。

【当前用户资产情报】：
{{chain_context}}

【必须收集的信息】：
1. 储蓄目标 (savings_goal) - 哪怕是微小的目标，也要视为伟大的事业。
2. 目标金额 (target_amount) - 精确的数字。
3. 截止时间 (deadline) - 时间就是金钱。
4. 风险偏好 (risk_strategy) - 您是想激进如蝙蝠车，还是稳健如韦恩庄园的地基？

【当前上下文】：
当前时间戳: {int(time.time())}

【你的任务逻辑】：
1. 分析用户输入，判断信息是否齐全。
2. 参考【用户资产情报】：
   - 如果用户余额不足以支付他想要存的金额，请委婉地、管家式地提醒（例如：“恕我直言，目前的流动性可能稍显紧张...”）。
   - 如果用户非常富有，可以适当调侃（例如：“这点小钱对韦恩企业来说，不过是九牛一毛。”）。
3. 如果**信息缺失**：
   - 用管家的口吻优雅地追问。
   - 示例："恕我多嘴，老爷，我们要为这项伟大的计划准备多少预算呢？还是说，您打算直接买下整家公司？"
   - 返回 JSON: {{ "type": "question", "content": "你的管家式追问..." }}
4. 如果**信息已齐全**：
   - 优雅地确认，并生成计划。
   - 示例："正如您所愿，Master Wayne。这是为您拟定的资产增值方案，请过目。如果是为了哥谭市的未来，这笔钱花得很值。"
   - 返回 JSON:
     {{
       "type": "plan",
       "content": "管家式的确认话术...",
       "data": {{
         "user_wallet_address": "用户的钱包地址(从上下文中找，找不到填 '0xUnknown')",
         "savings_goal": "...",
         "token_address": "0x5F04bbc4d96b5cffc2363e472090F3A8344E4e56",
         "amount_per_cycle": "根据总金额和时间计算出的每期金额(字符串)",
         "cycle_frequency_seconds": 604800,
         "start_time_timestamp": {int(time.time())},
         "risk_strategy": "conservative 或 aggressive",
         "nudge_enabled": true
       }}
     }}

请严格只返回 JSON 格式字符串。
"""

# --- 新增：Alfred 首页问候语 Prompt ---
GREETING_PROMPT_TEMPLATE = """
你现在是 Alfred（蝙蝠侠的管家）。
用户（Master Wayne）刚刚打开了 ZetaSave 储蓄面板。
请根据以下数据，说一句简短、优雅、带有英式幽默或哲理的管家式问候。

【用户状态】：
- 储蓄目标：{goal}
- 当前进度：{progress}%

【要求】：
1. 字数控制在 40 字以内。
2. 风格：沉稳、忠诚、偶尔毒舌但温暖。
3. 如果进度低（<10%），鼓励起步；如果进度高（>80%），预祝胜利。
4. 不要生成 JSON，直接返回那句话的文本。
"""


# [修改] 增加了 chain_data 参数
def chat_with_ai(user_input: str, history: list = [], chain_data: dict = None) -> dict:
    """
    处理多轮对话，返回 {"type": "question" | "plan", "content": "...", "data": ...}
    chain_data 示例: {"balance": 100.5, "nft_count": 2}
    """
    history_text = ""
    if history:
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    
    # --- 处理链上数据上下文 ---
    chain_context_str = "暂无钱包连接或数据读取失败"
    if chain_data:
        balance = chain_data.get('balance', 0)
        nft_count = chain_data.get('nft_count', 0)
        chain_context_str = f"- 钱包余额: {balance} ZETA\n- 已持有储蓄计划(NFT)数量: {nft_count} 个"
    
    # 替换 System Prompt 中的占位符
    final_system_prompt = CHAT_SYSTEM_PROMPT.replace("{chain_context}", chain_context_str)
    
    user_prompt = f"【对话历史】:\n{history_text}\n\n【用户当前输入】:\n{user_input}"

    try:
        resp = client.chat.completions.create(
            model="qwen-plus",
            messages=[
                {"role": "system", "content": final_system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = resp.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print("Chat Error:", e)
        return {"type": "question", "content": "Master Wayne，似乎通讯线路受到了干扰... (请检查后端日志)"}


# --- 新增：生成问候语函数 ---
def generate_greeting(goal: str, progress: float) -> str:
    """
    根据目标和进度，生成首页的随机管家问候
    """
    # 构造 Prompt
    prompt = GREETING_PROMPT_TEMPLATE.replace("{goal}", goal).replace("{progress}", str(progress))
    
    try:
        resp = client.chat.completions.create(
            model="qwen-plus",
            messages=[
                {"role": "system", "content": "你是 Alfred Pennyworth。"},
                {"role": "user", "content": prompt}
            ],
            # 增加随机性，让每次刷新都不一样
            temperature=0.9
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print("Greeting Error:", e)
        return "欢迎回来，Master Wayne。今天的哥谭市依然平静。"


def send_to_backend(plan_data: dict):
    print("🚀 正在发送给后端...")
    try:
        res = requests.post(BACKEND_URL, json=plan_data)
        if res.status_code == 200:
            print("✅ 成功！后端返回:", res.json())
        else:
            print("❌ 写入失败:", res.status_code, res.text)
    except Exception as e:
        print("❌ 连接后端失败:", e)


if __name__ == "__main__":
    print("--- 开始测试 Alfred (Qwen版 - 直连模式) ---")
    
    # 测试问候语功能
    print("\n[测试问候语]")
    greeting = generate_greeting("买蝙蝠车", 5.0)
    print(f"Goal: 买蝙蝠车, Progress: 5% -> {greeting}")

    # 模拟测试对话 (带余额数据)
    print("\n[测试对话 - 带余额]")
    mock_chain_data = {"balance": 5.5, "nft_count": 1}
    res1 = chat_with_ai("我要存 10000 ZETA 买个岛", [], chain_data=mock_chain_data)
    print("User: 我要存 10000 ZETA")
    print("Alfred (Should warn about balance):", res1.get('content'))