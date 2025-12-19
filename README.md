
```markdown
# ZetaSave · AI & Backend 模块说明

本模块是 ZetaSave 个性化储蓄 DApp 的 **AI + 后端原型**，负责将用户的自然语言储蓄目标转换为结构化计划数据，并通过接口提供给智能合约和前端使用。[web:19][web:23]

---

## 目录结构建议（放入本仓库）

建议在 GitHub 仓库中新增一个 `backend/` 目录，将本地代码整理为：

```

```text
ZetaSave/
├── backend/
│   ├── app/
│   │   └── main.py           # FastAPI 后端：创建计划 + 合约读接口
│   ├── ai_module/
│   │   └── agent.py          # DeepSeek 调用：生成储蓄 JSON 并写入后端
│   ├── run_server.py         # 一键启动 FastAPI 的入口
│   └── requirements.txt      # 后端与 AI 依赖
└── README.md                 # 仓库总说明，可在其中链接本文件


---

## 功能概览

- 使用 **AI模型** 将用户输入的自然语言目标（含钱包地址、目标金额/期限等）转为标准化储蓄计划 JSON。[web:23]
- 使用 **FastAPI** 提供两类接口：  
  - `POST /api/create-plan`：接收并保存 AI 生成的储蓄计划（数据面板写入）。[web:19]  
  - `GET /api/contract-data/{user_address}`：按钱包地址返回给合约/脚本使用的最简参数集合。[web:19]
- 目前使用内存数组 `fake_db` 模拟数据库，方便在 Hackathon 阶段快速迭代与演示。

---

## 快速启动

### 1. 配置环境变量

在 `backend/` 目录下新建 `.env` 文件：

```
QWEN_API_KEY=你的API密钥
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
ZETA_CONTRACT_ADDRESS=0x00C44615A4e7DE83A82C62A575B1A33B473312Cc
WEB3_TIMEOUT=30
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

后端运行在 http://127.0.0.1:8000，API 文档：http://127.0.0.1:8000/docs

### 3. 启动前端

新开终端：

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 打开 ZetaSave 网页

### 4. 获取测试 ZRC-20 Tokens

**重要**: 要创建储蓄计划，你需要持有 ZRC-20 tokens（跨链资产的包装 token）。

**ZRC-20 vs ZETA 的区别**:
- **ZETA**: ZetaChain 原生 token，用于支付 gas 费用
- **ZRC-20**: 从其他链（如 ETH Sepolia, Base Sepolia）桥接来的跨链资产（ETH, USDC 等）

**支持的 ZRC-20 Tokens**:
- ETH Sepolia ETH: `0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0`
- Base Sepolia ETH: `0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD`
- ETH Sepolia USDC: `0xcC683A782f4B30c138787CB5576a86AF66fdc31d`
- Base Sepolia USDC: `0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19`

**如何获取 ZRC-20 测试 Tokens**:
1. 访问 ZetaChain Labs Faucet: https://labs.zetachain.com/get-zeta
2. 选择你想要的源链（ETH Sepolia 或 Base Sepolia）
3. 选择 token 类型（ETH 或 USDC）
4. 输入你的钱包地址并领取
5. 等待跨链桥接完成（通常需要几分钟）
6. 在 MetaMask 切换到 ZetaChain Athens Testnet 查看余额

**注册 Tokens（合约 Owner）**:
如果你是合约 owner，需要先注册这些 tokens：
```bash
cd scripts
PRIVATE_KEY=your_private_key npx ts-node registerTokens.ts
```

---

## FastAPI 接口设计

### 1. 创建储蓄计划

**POST** `/api/create-plan`

- **请求体（SavingPlan 模型）：**

```

{
"user_wallet_address": "0xAnWei888",
"savings_goal": "买 MacBook Pro",
"token_address": "0x5F04bbc4d96b5cffc2363e472090F3A8344E4e56",
"amount_per_cycle": "166.67",
"cycle_frequency_seconds": 604800,
"start_time_timestamp": 1765458969,
"risk_strategy": "conservative",
"nudge_enabled": true
}

```

- **逻辑：**

  - 校验 `amount_per_cycle` > 0。  
  - 自动生成 `plan_id`（如 `plan_1`），添加 `created_at` 和 `status = "ACTIVE"`。  
  - 存入内存数组 `fake_db` 作为临时数据库。

- **返回：**

```

{
"status": "success",
"plan_id": "plan_1"
}

```

### 2. 给合约/脚本读取的最小参数集

**GET** `/api/contract-data/{user_address}`

- **输入：**  
  - `user_address`：用户钱包地址（如 `0xAnWei888`）。

- **逻辑：**

  - 在 `fake_db` 中按 `user_wallet_address` 反向遍历，找到该用户最近一条 `ACTIVE` 计划。  
  - 若不存在，返回 `{ "action": "NONE" }`。  
  - 若存在，组合为给合约脚本使用的最小字段集合。

- **返回示例（存在计划）：**

```

{
"action": "DEPOSIT",
"token": "0x5F04bbc4d96b5cffc2363e472090F3A8344E4e56",
"amount": "166.67",
"interval": 604800
}

```

链下脚本可直接用这些字段调用 Solidity 合约的 `deposit` 等方法，实现「AI 决策 → 链上执行」的闭环。[web:22]

---

## 与其他模块的集成方式

### 前端

- 提供一个输入框收集用户的储蓄目标（自然语言 + 钱包地址等）。  
- 将用户输入发送给一个后端路由（可以是包装后的 `/ai/generate-plan`，内部再调用 `agent.py` 逻辑）获得储蓄计划 JSON。[web:19]  
- 展示 JSON 的关键信息（每期金额、频率、目标名称等），让用户确认。  
- 用户确认后，将该 JSON 发送到 `POST /api/create-plan` 完成计划创建。

### 智能合约 / 执行脚本

- 由前端或 Keeper 脚本根据用户钱包地址调用：  
  `GET /api/contract-data/{wallet}`。  
- 若返回 `action = "DEPOSIT"`，使用 `token/amount/interval` 构造并发送链上交易；若为 `"NONE"` 则不操作。 [web:22]

---

## 后续迭代方向（给评审/队内同步用）

- 将当前内存 `fake_db` 替换为真实数据库（PostgreSQL / SQLite），支持持久化与查询。  
- 增加多目标支持与计划状态流转（`PENDING / ACTIVE / COMPLETED / CANCELLED`）。  
- AI 端增加更多个性化维度（目标优先级、行为 nudges 策略等），扩展 JSON 结构，并在前端做更友好的可视化展示。[web:18][web:23]  

