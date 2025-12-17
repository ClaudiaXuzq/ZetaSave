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

# 🔴 因为你关了梯子，所以这里不需要 PROXY_URL
# 如果以后要开梯子，再把下面这行解开，并把 proxies 加回去
# PROXY_URL = "http://127.0.0.1:7897"

# 1. 配置 HTTP 客户端 (仅设置超时，不走代理)
custom_http_client = httpx.Client(
    timeout=60.0
    # proxies={ "http://": ..., "https://": ... }  <-- 直连模式下这行必须删掉
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

【必须收集的信息】：
1. 储蓄目标 (savings_goal) - 哪怕是微小的目标，也要视为伟大的事业。
2. 目标金额 (target_amount) - 精确的数字。
3. 截止时间 (deadline) - 时间就是金钱。
4. 风险偏好 (risk_strategy) - 您是想激进如蝙蝠车，还是稳健如韦恩庄园的地基？

【当前上下文】：
当前时间戳: {int(time.time())}

【你的任务逻辑】：
1. 分析用户输入，判断信息是否齐全。
2. 如果**信息缺失**：
   - 用管家的口吻优雅地追问。
   - 示例："恕我多嘴，老爷，我们要为这项伟大的计划准备多少预算呢？还是说，您打算直接买下整家公司？"
   - 返回 JSON: {{ "type": "question", "content": "你的管家式追问..." }}
3. 如果**信息已齐全**：
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

def chat_with_ai(user_input: str, history: list = []) -> dict:
    """
    处理多轮对话，返回 {"type": "question" | "plan", "content": "...", "data": ...}
    """
    history_text = ""
    if history:
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    
    user_prompt = f"【对话历史】:\n{history_text}\n\n【用户当前输入】:\n{user_input}"

    try:
        resp = client.chat.completions.create(
            model="qwen-plus",
            messages=[
                {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = resp.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print("Chat Error:", e)
        return {"type": "question", "content": "Master Wayne，似乎通讯线路受到了干扰... (请检查后端日志)"}


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
    
    # 模拟测试
    res1 = chat_with_ai("你好，我想存点钱", [])
    print("Alfred Round 1:", res1.get('content')) 

    history = [
        {"role": "user", "content": "你好，我想存点钱"},
        {"role": "assistant", "content": res1.get('content', '')}
    ]
    res2 = chat_with_ai("为了去巴黎，大概需要5000刀", history)
    print("Alfred Round 2:", res2.get('content'))
