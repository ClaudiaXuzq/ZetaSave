# models.py
# Pydantic 数据模型

from pydantic import BaseModel
from typing import List

class NFTMetadata(BaseModel):
    """NFT 元数据模型"""
    token_id: int
    milestone_percent: str          # 里程碑百分比（字符串，防止精度丢失）
    achievement_date: str           # 达成日期时间戳（字符串）
    savings_amount: str             # 储蓄金额 Wei（字符串）
    token_address: str              # 代币地址
    goal_description: str           # 目标描述

class UserNFTsResponse(BaseModel):
    """用户 NFT 列表响应模型"""
    user_address: str               # 用户地址
    nft_count: int                  # NFT 数量
    nfts: List[NFTMetadata]         # NFT 列表

class UserPlanResponse(BaseModel):
    """用户计划响应模型"""
    token_address: str              # 代币地址
    target_amount: str              # 目标金额 Wei（字符串）
    current_amount: str             # 当前金额 Wei（字符串）
    amount_per_cycle: str           # 每周期金额 Wei（字符串）
    cycle_frequency: int            # 周期频率（秒）
    start_time: str                 # 开始时间戳（字符串）
    last_deposit_time: str          # 最后存款时间戳（字符串）
    is_active: bool                 # 是否激活
    milestone_50_claimed: bool      # 50% 里程碑是否领取
    milestone_100_claimed: bool     # 100% 里程碑是否领取
    savings_goal: str               # 储蓄目标描述
    progress_percent: str           # 进度百分比（字符串）
