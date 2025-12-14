# web3_service.py
# Web3 服务层 - 处理与智能合约的所有交互

import json
import time
from typing import List, Dict, Any
from web3 import Web3
from web3.exceptions import ContractLogicError
from eth_utils import is_address, to_checksum_address

class Web3Error(Exception):
    """Web3 基础异常"""
    pass

class Web3ConnectionError(Web3Error):
    """RPC 连接错误"""
    pass

class InvalidAddressError(Web3Error):
    """无效地址错误"""
    pass

class ContractCallError(Web3Error):
    """合约调用错误"""
    pass

class PlanNotFoundError(Web3Error):
    """计划不存在错误"""
    pass

class Web3Service:
    """Web3 服务类 - 封装所有区块链交互"""

    def __init__(self, rpc_url: str, contract_address: str, abi_path: str, timeout: int = 30, max_retries: int = 3):
        """
        初始化 Web3 服务

        Args:
            rpc_url: RPC 端点 URL
            contract_address: 合约地址
            abi_path: ABI 文件路径
            timeout: 请求超时时间（秒）
            max_retries: 最大重试次数
        """
        self.rpc_url = rpc_url
        self.timeout = timeout
        self.max_retries = max_retries

        # 初始化 Web3 连接
        self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': timeout}))

        # 验证连接
        if not self._verify_connection():
            raise Web3ConnectionError(f"无法连接到 RPC: {rpc_url}")

        # 加载 ABI
        self.abi = self._load_abi(abi_path)

        # 验证并转换合约地址为 checksum 格式
        self.contract_address = self._validate_address(contract_address)

        # 创建合约实例
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=self.abi
        )

        print(f"✅ Web3Service 初始化成功")
        print(f"   RPC: {rpc_url}")
        print(f"   合约: {self.contract_address}")

    def _verify_connection(self) -> bool:
        """验证 RPC 连接"""
        try:
            self.w3.eth.block_number
            return True
        except Exception as e:
            print(f"❌ RPC 连接失败: {e}")
            return False

    def _load_abi(self, abi_path: str) -> List[Dict]:
        """加载 ABI 文件"""
        try:
            with open(abi_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"ABI 文件未找到: {abi_path}")
        except json.JSONDecodeError:
            raise ValueError(f"ABI 文件格式错误: {abi_path}")

    def _validate_address(self, address: str) -> str:
        """
        验证并转换地址为 checksum 格式

        Args:
            address: 以太坊地址

        Returns:
            str: Checksum 格式的地址

        Raises:
            InvalidAddressError: 地址格式无效
        """
        if not address:
            raise InvalidAddressError("地址不能为空")

        # 检查是否为有效的以太坊地址
        if not is_address(address):
            raise InvalidAddressError(f"无效的以太坊地址: {address}")

        # 转换为 checksum 格式
        return to_checksum_address(address)

    def _wei_to_string(self, value: int) -> str:
        """
        将 Wei 值转换为字符串（防止 JavaScript 精度丢失）

        Args:
            value: Wei 值

        Returns:
            str: 字符串格式的 Wei 值
        """
        return str(value)

    def _call_contract_with_retry(self, func_call) -> Any:
        """
        带重试逻辑的合约调用

        Args:
            func_call: 合约函数调用

        Returns:
            合约调用结果

        Raises:
            Web3ConnectionError: 重试后仍失败
        """
        last_error = None

        for attempt in range(self.max_retries):
            try:
                return func_call()
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    # 指数退避
                    wait_time = 2 ** attempt
                    print(f"⚠️ 合约调用失败，{wait_time}秒后重试... (尝试 {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                else:
                    print(f"❌ 合约调用失败，已达最大重试次数")

        raise Web3ConnectionError(f"合约调用失败: {last_error}")

    def get_user_nfts(self, user_address: str) -> List[int]:
        """
        获取用户的 NFT 列表

        Args:
            user_address: 用户地址

        Returns:
            List[int]: NFT Token ID 列表

        Raises:
            InvalidAddressError: 地址格式无效
            Web3ConnectionError: RPC 连接失败
        """
        # 验证地址
        validated_address = self._validate_address(user_address)

        # 调用合约
        try:
            nft_ids = self._call_contract_with_retry(
                lambda: self.contract.functions.getUserNFTs(validated_address).call()
            )
            return list(nft_ids)
        except Exception as e:
            raise ContractCallError(f"获取用户 NFT 失败: {e}")

    def get_nft_metadata(self, token_id: int) -> Dict[str, Any]:
        """
        获取 NFT 元数据

        Args:
            token_id: NFT Token ID

        Returns:
            Dict: NFT 元数据

        Raises:
            ContractCallError: 合约调用失败
        """
        try:
            result = self._call_contract_with_retry(
                lambda: self.contract.functions.getNFTMetadata(token_id).call()
            )

            # 解构返回值
            milestone_percent, achievement_date, savings_amount, token_address, goal_description = result

            return {
                "token_id": token_id,
                "milestone_percent": self._wei_to_string(milestone_percent),
                "achievement_date": self._wei_to_string(achievement_date),
                "savings_amount": self._wei_to_string(savings_amount),
                "token_address": token_address,
                "goal_description": goal_description
            }
        except ContractLogicError as e:
            raise ContractCallError(f"NFT 不存在或合约调用失败: {e}")
        except Exception as e:
            raise ContractCallError(f"获取 NFT 元数据失败: {e}")

    def get_user_plan(self, user_address: str, plan_id: int) -> Dict[str, Any]:
        """
        获取用户的储蓄计划

        Args:
            user_address: 用户地址
            plan_id: 计划 ID

        Returns:
            Dict: 计划详情

        Raises:
            InvalidAddressError: 地址格式无效
            PlanNotFoundError: 计划不存在
            ContractCallError: 合约调用失败
        """
        # 验证地址
        validated_address = self._validate_address(user_address)

        try:
            result = self._call_contract_with_retry(
                lambda: self.contract.functions.getUserPlan(validated_address, plan_id).call()
            )

            # 解构返回值 (12 个字段)
            (token_address, target_amount, current_amount, amount_per_cycle,
             cycle_frequency, start_time, last_deposit_time, active,
             milestone_50_claimed, milestone_100_claimed, savings_goal, progress_percent) = result

            # 检查计划是否存在（根据 active 状态或其他标志）
            # 如果 target_amount 为 0，可能表示计划不存在
            if target_amount == 0 and current_amount == 0:
                raise PlanNotFoundError(f"计划不存在: address={user_address}, plan_id={plan_id}")

            return {
                "token_address": token_address,
                "target_amount": self._wei_to_string(target_amount),
                "current_amount": self._wei_to_string(current_amount),
                "amount_per_cycle": self._wei_to_string(amount_per_cycle),
                "cycle_frequency": cycle_frequency,
                "start_time": self._wei_to_string(start_time),
                "last_deposit_time": self._wei_to_string(last_deposit_time),
                "is_active": active,
                "milestone_50_claimed": milestone_50_claimed,
                "milestone_100_claimed": milestone_100_claimed,
                "savings_goal": savings_goal,
                "progress_percent": self._wei_to_string(progress_percent)
            }
        except PlanNotFoundError:
            raise
        except ContractLogicError as e:
            raise PlanNotFoundError(f"计划不存在或合约调用失败: {e}")
        except Exception as e:
            raise ContractCallError(f"获取用户计划失败: {e}")
