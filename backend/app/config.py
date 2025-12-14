# config.py
# 配置管理模块

import os
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Settings:
    """应用配置类"""

    # ZetaChain 配置
    ZETA_RPC_URL: str = os.getenv(
        "ZETA_RPC_URL",
        "https://zetachain-athens-evm.blockpi.network/v1/rpc/public"
    )

    ZETA_CONTRACT_ADDRESS: str = os.getenv(
        "ZETA_CONTRACT_ADDRESS",
        "0x3E0c67B0dB328BFE75d68b5236fD234E01E8788b"
    )

    # Web3 配置
    WEB3_TIMEOUT: int = int(os.getenv("WEB3_TIMEOUT", "30"))
    WEB3_RETRY_ATTEMPTS: int = int(os.getenv("WEB3_RETRY_ATTEMPTS", "3"))

    # ABI 文件路径
    ABI_FILE_PATH: str = os.path.join(
        Path(__file__).parent,
        "abi",
        "ZetaSavings.json"
    )

    def validate(self):
        """验证必需的配置"""
        if not self.ZETA_RPC_URL:
            raise ValueError("ZETA_RPC_URL is required")
        if not self.ZETA_CONTRACT_ADDRESS:
            raise ValueError("ZETA_CONTRACT_ADDRESS is required")
        if not os.path.exists(self.ABI_FILE_PATH):
            raise FileNotFoundError(f"ABI file not found: {self.ABI_FILE_PATH}")
        return True

# 创建全局配置实例
settings = Settings()
