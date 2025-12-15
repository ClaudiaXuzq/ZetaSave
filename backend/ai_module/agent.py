# backend/ai_module/agent.py

import os
import time
import json
import requests
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

BACKEND_URL = "http://127.0.0.1:8000/api/create-plan"

# --- 1. 旧功能：单次生成 (保留以兼容) ---
def generate_savings_plan(user_input: str) -> dict:
    """
    [Legacy] 调用 DeepSeek 生成个性化储蓄计划（JSON）
    """
    print("🤖 DeepSeek 正在生成储蓄计划 (One-shot)...")

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

    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ],
        response_format={"type": "json_object"}
    )

    content = resp.choices[0].message.content
    print("✨ DeepSeek 原始输出:", content)
    data = json.loads(content)
    return data


# --- 2. 新功能：多轮对话状态机 ---
CHAT_SYSTEM_PROMPT = f"""
你是一个专业的储蓄规划助手 ZetaAI。你的目标是通过多轮对话，引导用户提供生成储蓄计划所需的关键信息，最后生成 JSON。

【必须收集的信息】：
1. 储蓄目标 (savings_goal) - 例如：买车、旅游
2. 目标金额 (target_amount) - 例如：2000U
3. 截止时间或周期 (deadline) - 例如：3个月后
4. 风险偏好 (risk_strategy) - 激进/稳健/保守

【当前上下文】：
当前时间戳: {int(time.time())}

【你的任务逻辑】：
1. 分析用户输入和历史对话，判断上述4个信息是否已全部明确。
2. 如果**信息缺失**：
   - 用亲切、自然的口吻追问缺失的信息。一次只问1-2个问题。
   - 返回 JSON 格式：{{ "type": "question", "content": "你的追问文本..." }}
3. 如果**信息已齐全**：
   - 总结用户需求，并生成最终计划数据。
   - 返回 JSON 格式：
     {{
       "type": "plan",
       "content": "好的，我已经为你生成了专属储蓄计划，请确认...",
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
    # 构造历史对话文本供 AI 参考
    history_text = ""
    if history:
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    
    # 动态注入 User Input
    user_prompt = f"【对话历史】:\n{history_text}\n\n【用户当前输入】:\n{user_input}"

    try:
        resp = client.chat.completions.create(
            model="deepseek-chat",
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
        return {"type": "question", "content": "抱歉，系统繁忙，请稍后再试。"}


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
    # 本地测试 Chat 模式
    print("--- 开始测试多轮对话 ---")
    
    # 模拟第1轮：用户只是打招呼
    res1 = chat_with_ai("你好，我想存钱", [])
    print("AI Round 1:", res1['content']) 
    # 预期 AI 应该追问目标

    # 模拟第2轮：用户回答目标，但没说金额
    history = [
        {"role": "user", "content": "你好，我想存钱"},
        {"role": "assistant", "content": res1['content']}
    ]
    res2 = chat_with_ai("我想去日本旅游", history)
    print("AI Round 2:", res2['content'])
    # 预期 AI 追问金额和时间

    # 模拟第3轮：信息全了
    history.append({"role": "user", "content": "我想去日本旅游"})
    history.append({"role": "assistant", "content": res2['content']})
    res3 = chat_with_ai("预算2万，大概半年后去，我要稳健一点", history)
    
    if res3['type'] == 'plan':
        print("✅ 最终生成计划:", json.dumps(res3['data'], indent=2, ensure_ascii=False))
        # 自动写入后端测试
        send_to_backend(res3['data'])
    else:
        print("AI Round 3 (还在追问):", res3['content'])
