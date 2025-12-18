# ZetaSave 跨链存取款和NFT功能文档

> 版本: 1.0
> 日期: 2024-12-18
> 合约地址: `0x9BE8A2541A047E9A48d0626d64CF73d8f17D95DD` (ZetaChain Athens Testnet)

---

## 📚 目录

1. [系统架构](#系统架构)
2. [代币逻辑说明](#代币逻辑说明)
3. [创建储蓄计划](#创建储蓄计划)
4. [存款操作](#存款操作)
5. [取款操作](#取款操作)
6. [NFT里程碑系统](#nft里程碑系统)
7. [前端集成状态](#前端集成状态)
8. [已知问题](#已知问题)

---

## 系统架构

### Omnichain架构设计

ZetaSave采用ZetaChain的全链架构：

```
┌─────────────────────────────┐
│     源链 (Source Chains)     │
│  - ETH Sepolia (11155111)   │
│  - Base Sepolia (84532)     │
│                             │
│  用户操作:                   │
│  - 发送ETH到Gateway合约      │
│  - Gateway跨链消息到ZetaChain│
└──────────┬──────────────────┘
           │ Gateway.depositAndCall()
           ↓
┌─────────────────────────────┐
│    ZetaChain Athens (7001)  │
│                             │
│  ZetaSaveCrossChain合约:    │
│  - 接收跨链消息 (onCall)     │
│  - 存储储蓄计划数据          │
│  - 管理ZRC-20代币           │
│  - 铸造里程碑NFT            │
└─────────────────────────────┘
```

**关键特性**：
- **数据集中存储**：所有储蓄计划和NFT存储在ZetaChain上
- **跨链操作**：用户可从任何支持的源链发起存取款
- **统一状态**：无论从哪条链操作，看到的都是同一个计划状态

---

## 代币逻辑说明

### 1️⃣ 用户创建储蓄计划需要哪些代币？

**必需：ZRC-20 代币**（ZetaChain上的跨链资产标准）

| Token | ZRC-20 地址 | Decimals | 源链 | 符号 |
|-------|------------|----------|------|------|
| ETH Sepolia ETH | `0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0` | 18 | ETH Sepolia | ETH |
| Base Sepolia ETH | `0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD` | 18 | Base Sepolia | ETH |
| ETH Sepolia USDC | `0xcC683A782f4B30c138787CB5576a86AF66fdc31d` | 6 | ETH Sepolia | USDC |
| Base Sepolia USDC | `0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19` | 6 | Base Sepolia | USDC |

**如何获取ZRC-20代币**：
```
🌐 ZetaChain Labs Faucet
https://labs.zetachain.com/get-zeta
```

**创建流程**：
1. 用户在源链（ETH Sepolia或Base Sepolia）持有原生ETH
2. 调用Gateway的 `depositAndCall()` 发送ETH和跨链消息
3. Gateway将ETH转换为对应的ZRC-20代币
4. ZetaChain上的合约接收ZRC-20并创建计划

### 2️⃣ 用户存款可以用什么代币？

**只能使用创建计划时选择的ZRC-20代币**

例如：
- ✅ 计划用"ETH Sepolia ETH"创建 → 存款也用"ETH Sepolia ETH"
- ❌ 不能用"Base Sepolia ETH"存款到"ETH Sepolia ETH"计划

**存款方式有两种**：

#### 方式A：直接在ZetaChain操作
```solidity
depositDirect(uint256 planId, uint256 amount)
```
- 用户钱包连接到ZetaChain
- 直接调用合约的 `depositDirect` 函数
- 需要先 `approve` ZRC-20代币给合约

#### 方式B：从源链跨链存款
```
用户在源链 → Gateway.depositAndCall() → ZetaChain合约
```
- 用户钱包连接到源链（ETH Sepolia或Base Sepolia）
- 发送ETH到Gateway，附带存款消息
- Gateway自动跨链到ZetaChain并执行存款

### 3️⃣ 取款取出什么币？

**取出的是ZRC-20代币**（在ZetaChain上）

```solidity
withdraw(uint256 planId, uint256 amount, bytes memory recipient)
```

**参数说明**：
- `planId`: 计划ID
- `amount`: 取款金额（wei单位）
- `recipient`: 接收地址（bytes格式，支持跨链取款）

**取款选项**：
- 📍 取到ZetaChain地址：直接收到ZRC-20代币
- 🌉 跨链取回源链：通过 `recipient` 参数指定源链和地址（需要合约支持）

### 4️⃣ 在Zeta链上的存储形式

**储蓄计划数据结构**：

```solidity
struct SavingsPlan {
    address zrc20Token;           // ZRC-20代币地址（如0x05BA149A...）
    uint256 targetAmount;         // 目标金额（wei）
    uint256 currentAmount;        // 当前存款（wei）
    uint256 startTime;            // 计划开始时间（Unix时间戳）
    string savingsGoal;           // 目标描述（如"购买MacBook Pro"）
    bool isActive;                // 是否激活
    bool milestone50Claimed;      // 50%里程碑是否已领取
    bool milestone100Claimed;     // 100%里程碑是否已领取
    uint256 sourceChainId;        // 源链ID（11155111或84532）
}
```

**存储位置**：
```solidity
mapping(address => mapping(uint256 => SavingsPlan)) public userPlans;
mapping(address => uint256) public userPlanCount;
```

**余额存储**：
- 代币实际余额存储在合约的ZRC-20代币账户中
- 合约通过 `transferFrom` 接收代币
- 取款时通过 `transfer` 发送代币

---

## 创建储蓄计划

### 函数签名

```solidity
function createPlanDirect(
    address zrc20,              // ZRC-20代币地址
    uint256 targetAmount,       // 目标金额（wei）
    string memory savingsGoal,  // 目标描述
    uint256 initialDeposit      // 初始存款（wei）
) external nonpayable
```

### 前端调用示例

```typescript
// 1. Approve ZRC-20 token
const tokenContract = new ethers.Contract(zrc20Address, ERC20_ABI, signer);
const approveTx = await tokenContract.approve(
  ZETASAVE_CONTRACT.address,
  initialDeposit
);
await approveTx.wait();

// 2. Create plan
const contract = new ethers.Contract(
  ZETASAVE_CONTRACT.address,
  ZetaSaveCrossChainABI,
  signer
);
const tx = await contract.createPlanDirect(
  zrc20Address,
  targetAmountWei,
  "购买MacBook Pro",
  initialDepositWei
);
await tx.wait();
```

### 跨链创建（从源链）

```typescript
// 从Base Sepolia或ETH Sepolia创建计划
const message = encodeAbiParameters(
  parseAbiParameters('uint8, uint256, string'),
  [0, targetAmount, savingsGoal]  // opType=0表示创建计划
);

const tx = await writeContract({
  address: gatewayAddress,
  abi: GATEWAY_ABI,
  functionName: 'depositAndCall',
  args: [ZETASAVE_CONTRACT.address, message],
  value: initialDepositEth,  // 发送ETH作为初始存款
});
```

### 触发的事件

```solidity
event PlanCreated(
    address indexed user,
    uint256 planId,
    address zrc20,
    uint256 targetAmount
);
```

---

## 存款操作

### ⚠️ 当前状态：功能未完全实现

**已实现**：
- ✅ 合约函数：`depositDirect(planId, amount)`
- ✅ 前端Hook：`useCrossChainDeposit.ts`
- ✅ 跨链消息编码

**未实现**：
- ❌ Dashboard中没有存款按钮
- ❌ 没有存款弹窗/模态框
- ❌ Hook没有被任何组件使用
- ❌ AI对话框不支持存款意图识别

### 合约函数

```solidity
function depositDirect(
    uint256 planId,
    uint256 amount
) external nonpayable
```

**要求**：
1. 计划必须是激活状态（`isActive = true`）
2. 用户必须是计划的拥有者
3. 需要提前 `approve` 代币给合约

### 理论前端调用（未集成）

```typescript
// 使用Hook
const { deposit, isPending, isSuccess } = useCrossChainDeposit();

// 从源链存款
deposit(planId, ethers.parseEther("1.0"));  // 存1 ETH
```

### 触发的事件

```solidity
event DepositMade(
    address indexed user,
    uint256 planId,
    uint256 amount,
    uint256 newTotal
);

event CrossChainDeposit(
    address indexed user,
    address zrc20,
    uint256 amount,
    uint256 sourceChainId
);
```

### 自动里程碑检测

每次存款后，合约自动检查是否达到里程碑：
- 达到50%目标 → 铸造50% NFT
- 达到100%目标 → 铸造100% NFT

---

## 取款操作

### 函数签名

```solidity
function withdraw(
    uint256 planId,
    uint256 amount,
    bytes memory recipient
) external nonpayable
```

**参数说明**：
- `planId`: 计划ID
- `amount`: 取款金额（wei）
- `recipient`: 接收者地址（bytes格式，支持跨链）

**限制条件**：
1. 计划必须是激活状态
2. 用户必须是计划拥有者
3. 取款金额不能超过当前余额

### 前端调用示例

```typescript
const tx = await contract.withdraw(
  planId,
  ethers.parseEther("0.5"),  // 取款0.5代币
  ethers.toUtf8Bytes(userAddress)  // 接收地址
);
```

### 触发的事件

```solidity
event WithdrawalMade(
    address indexed user,
    uint256 planId,
    uint256 amount
);

event CrossChainWithdraw(
    address indexed user,
    address zrc20,
    uint256 amount,
    bytes recipient
);
```

---

## NFT里程碑系统

### NFT合约集成

ZetaSave合约实现了完整的ERC721标准：
- **合约名称**: "ZetaSave Milestone NFT"
- **符号**: "ZSMILE"
- **标准**: ERC721

### 里程碑规则

| 场景 | 达成进度 | 铸造结果 |
|------|---------|---------|
| 首次达到50% | 0% → 50% | 铸造1个"50% Milestone NFT" |
| 从50%到100% | 50% → 100% | 铸造1个"100% Milestone NFT" |
| 直接达到100% | 0% → 100% | 只铸造1个"100% Milestone NFT"（跳过50%） |

**防重复机制**：
- 每个里程碑只能铸造一次
- 标志位：`milestone50Claimed` 和 `milestone100Claimed`

### NFT元数据结构

```solidity
struct NFTMetadata {
    uint256 milestonePercent;      // 50 或 100
    uint256 achievementDate;       // 达成时间（Unix时间戳）
    uint256 savingsAmount;         // 达成时的金额（wei）
    address tokenAddress;          // 使用的ZRC-20代币地址
    string goalDescription;        // 储蓄目标描述
}
```

### 查询函数

```solidity
// 获取用户的所有NFT ID
function getUserNFTs(address user)
    external view returns (uint256[] memory)

// 获取NFT元数据
function getNFTMetadata(uint256 tokenId)
    external view returns (NFTMetadata memory)

// 获取NFT的动态URI
function tokenURI(uint256 tokenId)
    external view returns (string memory)
```

### tokenURI格式

NFT的 `tokenURI` 返回Base64编码的JSON：

```json
{
  "name": "ZetaSave Milestone 50%",
  "description": "Achieved 50% of savings goal: 购买MacBook Pro",
  "image": "ipfs://QmZetaSaveMilestone50",
  "attributes": [
    {
      "trait_type": "Milestone",
      "value": "50%"
    },
    {
      "trait_type": "Achievement Date",
      "value": "2024-12-18"
    },
    {
      "trait_type": "Savings Amount",
      "value": "0.5 ETH"
    },
    {
      "trait_type": "Chain",
      "value": "ETH Sepolia"
    },
    {
      "trait_type": "Asset",
      "value": "ETH"
    }
  ]
}
```

### 前端NFT展示

**组件路径**: `frontend/src/components/nft-gallery.tsx`

**Hook**: `useUserNFTs.ts`

**功能**：
- 自动获取用户所有NFT
- 解析Base64编码的metadata
- 响应式网格布局展示
- 显示里程碑徽章、成就日期、金额
- 提供区块浏览器链接

---

## 前端集成状态

### ✅ 已完成的功能

| 功能 | 文件路径 | 状态 |
|------|---------|------|
| 合约配置 | `frontend/src/config/contracts.ts` | ✅ 完成 |
| ABI定义 | `frontend/src/abi/ZetaSaveCrossChain.json` | ✅ 完成 |
| 获取用户计划 | `frontend/src/hooks/useUserPlans.ts` | ✅ 完成 |
| 获取用户NFT | `frontend/src/hooks/useUserNFTs.ts` | ✅ 完成 |
| 跨链创建计划Hook | `frontend/src/hooks/useCrossChainCreatePlan.ts` | ✅ 完成 |
| AI对话框（创建计划） | `frontend/src/components/ai-chat-panel.tsx` | ✅ 完成 |
| Dashboard展示 | `frontend/src/components/dashboard-layout.tsx` | ✅ 完成 |
| 计划卡片 | `frontend/src/components/plan/PlanCard.tsx` | ✅ 完成 |
| NFT画廊 | `frontend/src/components/nft-gallery.tsx` | ✅ 完成 |

### ❌ 缺失的功能

| 功能 | 问题描述 | 影响 |
|------|---------|------|
| 存款UI | PlanCard组件没有存款按钮 | 用户无法执行存款 |
| 存款弹窗 | 没有DepositModal组件 | 无法输入存款金额 |
| Hook集成 | `useCrossChainDeposit` Hook未被使用 | 存款功能无法调用 |
| AI存款意图 | AI只识别创建计划，不识别存款 | 用户对AI说"存款"会错误创建新计划 |

### 配置信息

**ZetaSave合约**：
```typescript
address: '0x9BE8A2541A047E9A48d0626d64CF73d8f17D95DD'
chainId: 7001  // ZetaChain Athens Testnet
```

**Gateway合约**：
```typescript
Base Sepolia: '0x0c487a766110c85d301d96e33579c5b317fa4995'
ETH Sepolia: '0x0c487a766110c85d301d96e33579c5b317fa4995'
```

**支持的ZRC-20代币**：见 `frontend/src/config/contracts.ts` 第30-60行

---

## 已知问题

### 🔴 关键问题：存款功能未实现

**现象**：
- 用户通过AI对话框创建了储蓄计划
- 想要继续存款时，Dashboard中没有存款按钮
- 如果用户再次对AI说"我要存款"，AI会误认为是创建新计划

**根本原因**：
1. **前端UI缺失**：
   - `PlanCard.tsx` 只展示计划信息，没有存款操作
   - 没有 `DepositModal` 或类似组件

2. **Hook未集成**：
   - `useCrossChainDeposit.ts` Hook已定义，但从未被导入和使用
   - 没有组件调用 `deposit()` 函数

3. **AI不支持存款意图**：
   - `backend/ai_module/agent.py` 的AI系统提示（第93-174行）只处理创建计划
   - 没有识别"存款"、"充值"、"追加"等关键词的逻辑

**需要修改的文件**（待用户确认）：
```
frontend/src/components/plan/PlanCard.tsx        - 添加存款按钮
frontend/src/components/modals/DepositModal.tsx  - 创建存款弹窗
frontend/src/components/dashboard-layout.tsx     - 集成存款逻辑
backend/ai_module/agent.py                       - 扩展AI意图识别
```

### ⚠️ 次要问题：命名不一致

**问题**：
- Solidity文件名：`ZetaSavings.sol`
- 前端ABI文件名：`ZetaSaveCrossChain.json`
- 虽然是同一个合约，但命名不一致可能造成混淆

**建议**：
- 统一为 `ZetaSaveCrossChain` 命名
- 或者全部改为 `ZetaSavings`

### ✅ 无需清理的内容

经过全面检查，确认：
- ✅ 只有一个主合约文件：`contracts/ZetaSavings.sol`
- ✅ 没有旧的合约文件需要删除
- ✅ 没有独立的NFT合约（NFT功能集成在主合约中）
- ✅ 只有两个ABI文件：前端和后端各一个，内容一致

---

## 使用流程图

```
┌─────────────────────────────────────────────────────┐
│                  用户旅程                            │
└─────────────────────────────────────────────────────┘

1. 获取ZRC-20代币
   └→ https://labs.zetachain.com/get-zeta

2. 创建储蓄计划
   ├→ 方式A: 通过AI对话框（前端已实现）
   │   └→ 选择源链和Token类型
   │   └→ 设置目标金额和描述
   │   └→ AI生成计划 → 用户确认 → 链上签名
   │
   └→ 方式B: 从源链跨链创建
       └→ 连接钱包到ETH/Base Sepolia
       └→ 调用Gateway.depositAndCall()

3. 存款 ⚠️ 当前未实现
   └→ （需要开发存款UI）

4. 自动获得里程碑NFT
   ├→ 50%进度 → 铸造50% NFT
   └→ 100%进度 → 铸造100% NFT

5. 在Dashboard查看
   ├→ 储蓄计划列表和进度
   └→ NFT画廊展示成就

6. 取款
   └→ 调用withdraw函数
   └→ 可选跨链取回源链
```

---

## 技术架构总结

### 智能合约层
- **平台**: ZetaChain Athens Testnet
- **标准**: ERC721 (NFT) + 自定义储蓄逻辑
- **跨链**: ZetaChain Gateway集成
- **代币**: ZRC-20标准

### 前端层
- **框架**: React + TypeScript
- **Web3库**: wagmi + ethers.js
- **UI**: shadcn/ui + Tailwind CSS
- **状态管理**: React Hooks

### 后端层
- **语言**: Python (FastAPI)
- **AI模型**: Qwen (阿里云)
- **Web3**: web3.py

---

## 快速参考

### 合约函数速查

| 函数 | 用途 | Gas估算 |
|------|------|---------|
| `createPlanDirect()` | 创建储蓄计划 | ~150k |
| `depositDirect()` | 存款（直接） | ~80k |
| `withdraw()` | 取款 | ~70k |
| `getUserPlan()` | 查询计划（view） | 0 |
| `getProgress()` | 查询进度（view） | 0 |
| `getUserNFTs()` | 查询NFT列表（view） | 0 |
| `getNFTMetadata()` | 查询NFT元数据（view） | 0 |

### 重要链接

| 资源 | URL |
|------|-----|
| ZetaChain Faucet | https://labs.zetachain.com/get-zeta |
| ZetaChain浏览器 | https://athens.explorer.zetachain.com |
| 合约地址 | 0x9BE8A2541A047E9A48d0626d64CF73d8f17D95DD |
| Base Sepolia浏览器 | https://sepolia.basescan.org |
| ETH Sepolia浏览器 | https://sepolia.etherscan.io |

---

## 联系和支持

如有问题，请检查：
1. 钱包是否连接到正确的网络
2. 是否持有足够的ZRC-20代币
3. 是否授权了代币给合约
4. 后端AI服务是否运行（http://127.0.0.1:8000）

---

**文档版本**: 1.0
**最后更新**: 2024-12-18
**维护者**: ZetaSave Team
