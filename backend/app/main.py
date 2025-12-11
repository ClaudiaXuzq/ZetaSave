# main.py
# 安装依赖: pip install fastapi uvicorn pydantic

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import datetime

app = FastAPI()

# --- 1. 定义数据模型 (严格遵守刚才群里确认的 JSON) ---
class SavingPlan(BaseModel):
    # plan_id 后端生成，所以这里可以不传，或者由AI传
    user_wallet_address: str
    savings_goal: str
    token_address: str
    amount_per_cycle: str      # 注意：金额用字符串接收，防止精度丢失
    cycle_frequency_seconds: int
    # total_cycles 已删除
    
    # 辅助字段
    start_time_timestamp: int
    risk_strategy: str
    nudge_enabled: bool

# --- 2. 模拟数据库 (用一个全局列表代替) ---
fake_db = []

@app.post("/api/create-plan")
async def create_plan(plan: SavingPlan):
    """
    接收前端发来的 JSON，存入数据库
    """
    # 1. 简单的校验
    if float(plan.amount_per_cycle) <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # 2. 模拟存库
    new_record = plan.dict()
    new_record['plan_id'] = f"plan_{len(fake_db) + 1}"  # 自动生成 ID
    new_record['created_at'] = datetime.datetime.now().isoformat()
    new_record['status'] = 'ACTIVE'
    
    fake_db.append(new_record)
    
    print(f"✅ 收到新计划: {new_record}")
    return {"status": "success", "plan_id": new_record['plan_id']}

@app.get("/api/contract-data/{user_address}")
async def get_contract_data(user_address: str):
    """
    给智能合约读取用的接口 (模拟)
    """
    # 查找该用户的最新计划
    user_plan = next((p for p in reversed(fake_db) if p["user_wallet_address"] == user_address), None)
    
    if not user_plan:
        return {"action": "NONE"}
    
    return {
        "action": "DEPOSIT",
        "token": user_plan['token_address'],
        "amount": user_plan['amount_per_cycle'],
        "interval": user_plan['cycle_frequency_seconds']
    }

# 启动命令: uvicorn main:app --reload
