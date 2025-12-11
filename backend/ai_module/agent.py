# ai_module/agent.py

import os
import time
import json
import requests
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,          # 或者直接写 "sk-xxxx"
    base_url="https://api.deepseek.com"
)

BACKEND_URL = "http://127.0.0.1:8000/api/create-plan"

def generate_savings_plan(user_input: str) -> dict:
    """
    调用 DeepSeek 生成个性化储蓄计划（JSON）
    """
    print("🤖 DeepSeek 正在生成储蓄计划...")

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
3. amount_per_cycle 要结合用户目标金额和期限，给出一个“相对合理又不太离谱”的值。
"""

    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ],
        response_format={"type": "json_object"}  # 强制 JSON
    )

    content = resp.choices[0].message.content
    print("✨ DeepSeek 原始输出:", content)
    data = json.loads(content)
    return data


def send_to_backend(plan_data: dict):
    print("🚀 正在发送给后端...")
    res = requests.post(BACKEND_URL, json=plan_data)
    if res.status_code == 200:
        print("✅ 成功！后端返回:", res.json())
    else:
        print("❌ 写入失败:", res.status_code, res.text)


if __name__ == "__main__":
    # 这里可以改成你想测的任何场景
    user_input = "我是安伟，钱包地址 0xAnWei888，我想在三个月内存钱买一台 MacBook Pro，大概需要 2000U。"
    try:
        plan = generate_savings_plan(user_input)
        send_to_backend(plan)
    except Exception as e:
        print("💥 出错了:", e)
