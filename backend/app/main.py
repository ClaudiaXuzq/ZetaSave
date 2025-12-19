# backend/app/main.py
# 安装依赖: pip install fastapi uvicorn pydantic web3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import datetime

# 导入 Web3 相关模块
from app.web3_service import (
    Web3Service,
    Web3ConnectionError,
    InvalidAddressError,
    ContractCallError,
    PlanNotFoundError
)
from app.config import settings
from app.models import UserNFTsResponse, UserPlanResponse, NFTMetadata

# 全局 Web3 服务实例
web3_service: Optional[Web3Service] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global web3_service

    # 启动时初始化 Web3
    print("🚀 正在初始化 Web3 服务...")
    try:
        settings.validate()
        web3_service = Web3Service(
            rpc_url=settings.ZETA_RPC_URL,
            contract_address=settings.ZETA_CONTRACT_ADDRESS,
            abi_path=settings.ABI_FILE_PATH,
            timeout=settings.WEB3_TIMEOUT,
            max_retries=settings.WEB3_RETRY_ATTEMPTS
        )
        print("✅ Web3 服务初始化成功")
    except Exception as e:
        print(f"❌ Web3 服务初始化失败: {e}")
        print("⚠️ 服务器将继续运行，但 Web3 功能不可用")

    yield

    # 关闭时清理
    print("👋 关闭 Web3 服务...")

app = FastAPI(lifespan=lifespan)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. 定义数据模型 ---
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

# --- 3. Web3 相关接口 ---

@app.get("/api/user-nfts/{address}", response_model=UserNFTsResponse)
async def get_user_nfts(address: str):
    """
    获取用户的 NFT 列表及元数据
    """
    # 检查 Web3 服务是否初始化
    if web3_service is None:
        raise HTTPException(
            status_code=503,
            detail="Web3 服务未初始化"
        )

    try:
        # 1. 获取用户的 NFT ID 列表
        nft_ids = web3_service.get_user_nfts(address)

        # 2. 获取每个 NFT 的元数据
        nfts_metadata = []
        for nft_id in nft_ids:
            try:
                metadata = web3_service.get_nft_metadata(nft_id)
                nfts_metadata.append(NFTMetadata(**metadata))
            except Exception as e:
                print(f"⚠️ 获取 NFT {nft_id} 元数据失败: {e}")
                continue

        # 3. 返回响应
        return UserNFTsResponse(
            user_address=address,
            nft_count=len(nfts_metadata),
            nfts=nfts_metadata
        )

    except InvalidAddressError as e:
        raise HTTPException(status_code=400, detail=f"无效的地址格式: {e}")
    except Web3ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"RPC 连接失败: {e}")
    except ContractCallError as e:
        raise HTTPException(status_code=500, detail=f"合约调用失败: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {e}")

@app.get("/api/plan-progress/{address}/{plan_id}", response_model=UserPlanResponse)
async def get_plan_progress(address: str, plan_id: int):
    """
    获取用户储蓄计划的进度
    """
    if web3_service is None:
        raise HTTPException(
            status_code=503,
            detail="Web3 服务未初始化"
        )

    if plan_id < 0:
        raise HTTPException(
            status_code=400,
            detail="plan_id 必须是非负整数"
        )

    try:
        plan_data = web3_service.get_user_plan(address, plan_id)
        return UserPlanResponse(**plan_data)

    except InvalidAddressError as e:
        raise HTTPException(status_code=400, detail=f"无效的地址格式: {e}")
    except PlanNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"计划不存在: {e}")
    except Web3ConnectionError as e:
        raise HTTPException(status_code=500, detail=f"RPC 连接失败: {e}")
    except ContractCallError as e:
        raise HTTPException(status_code=500, detail=f"合约调用失败: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {e}")

# =======================================================
#  [阶段一] Alfred 随机问候 (Random Greetings)
# =======================================================

class GreetingRequest(BaseModel):
    savings_goal: str       # 例如 "买蝙蝠车"
    current_amount: float   # 例如 500.0
    target_amount: float    # 例如 10000.0

@app.post("/api/ai/greeting")
async def get_greeting(req: GreetingRequest):
    """
    首页加载时调用，返回 Alfred 的随机问候
    """
    # 动态导入，避免循环引用
    from ai_module.agent import generate_greeting
    
    # 简单的进度计算逻辑，防止除以零
    progress = 0.0
    if req.target_amount > 0:
        progress = round((req.current_amount / req.target_amount) * 100, 1)
        
    print(f"🎩 Alfred 正在思考问候语... (目标: {req.savings_goal}, 进度: {progress}%)")

    # 调用 AI
    greeting_text = generate_greeting(req.savings_goal, progress)
    
    return {
        "status": "success",
        "greeting": greeting_text,
        "progress_display": f"{progress}%"
    }

# =======================================================
#  [功能结束]
# =======================================================


# --- 4. AI 多轮对话接口 (已升级：支持读取链上数据) ---

class ChatMessage(BaseModel):
    role: str      # 'user' 或 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str                  # 用户最新发的消息
    history: List[ChatMessage]    # 之前的聊天记录
    wallet_address: Optional[str] = "0xUnknown"

@app.post("/api/ai/chat")
async def chat_endpoint(req: ChatRequest):
    """
    前端调用此接口进行多轮对话。
    已集成：读取用户钱包余额和 NFT 数量
    """
    # 动态导入 agent 避免循环引用
    from ai_module.agent import chat_with_ai
    
    # --- [新增] 获取链上数据逻辑 ---
    chain_data = {"balance": 0.0, "nft_count": 0}
    
    # 只有当地址不是默认值且 Web3 服务可用时才查询
    if req.wallet_address and req.wallet_address != "0xUnknown" and web3_service:
        try:
            print(f"🔍 正在读取链上数据: {req.wallet_address}")
            # 1. 查余额 (需确保 Web3Service 已更新 get_native_balance 方法)
            balance = web3_service.get_native_balance(req.wallet_address)
            # 2. 查 NFT 数量
            nft_ids = web3_service.get_user_nfts(req.wallet_address)
            
            chain_data = {
                "balance": balance,
                "nft_count": len(nft_ids)
            }
            print(f"📊 链上数据获取成功: {chain_data}")
        except Exception as e:
            print(f"⚠️ 读取链上数据失败 (不影响对话): {e}")
    # -----------------------------

    # 转换 Pydantic 对象为 dict 列表给 agent 用
    history_dicts = [{"role": h.role, "content": h.content} for h in req.history]
    
    print(f"🤖 收到 AI 请求: {req.message}")

    # 调用 AI 核心逻辑 (传入 chain_data)
    ai_response = chat_with_ai(req.message, history_dicts, chain_data=chain_data)
    
    # 构造返回给前端的数据
    response_data = {
        "status": "success",
        "type": ai_response.get("type", "question"),
        "message": ai_response.get("content"),
        "plan_data": ai_response.get("data", None)
    }
    
    # 如果 AI 已经生成了 plan，我们顺便在后端打印一下日志
    if response_data["type"] == "plan" and response_data["plan_data"]:
        print(f"✅ AI 完成了计划生成: {response_data['plan_data']}")
        
    return response_data

# 启动命令: uvicorn main:app --reload