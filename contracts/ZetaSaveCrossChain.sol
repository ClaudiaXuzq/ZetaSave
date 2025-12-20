// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                          ZetaSave Cross-Chain                            ║
 * ║              跨链储蓄合约 - ZetaChain Universal App                       ║
 * ║                                                                          ║
 * ║  功能:                                                                    ║
 * ║  1. 接收来自 Base Sepolia 和 ETH Sepolia 的 ETH 和 USDC 存款              ║
 * ║  2. 支持储蓄计划管理（创建、存款、取款）                                    ║
 * ║  3. 在用户达到 50% 和 100% 里程碑时铸造 NFT 奖励                          ║
 * ║  4. 支持跨链取款回到源链                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// 接口定义 - 所有必要接口内联（适用于 Remix 部署）
// ============================================================================

/**
 * @dev ZRC-20 代币接口
 * ZRC-20 是 ZetaChain 上的跨链代币标准
 */
interface IZRC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    // ZRC-20 特有函数
    function withdraw(bytes memory to, uint256 amount) external returns (bool);
    function withdrawGasFee() external view returns (address, uint256);
    function withdrawGasFeeWithGasLimit(uint256 gasLimit) external view returns (address, uint256);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Deposit(bytes from, address indexed to, uint256 value);
    event Withdrawal(address indexed from, bytes to, uint256 value);
}

/**
 * @dev 消息上下文结构体
 * 包含跨链调用的来源信息
 */
struct MessageContext {
    bytes sender;      // 源链上的发送者地址（bytes 格式以支持不同链的地址格式）
    uint256 chainID;   // 源链的 Chain ID
}

/**
 * @dev 调用选项结构体
 * 用于指定跨链调用的参数
 */
struct CallOptions {
    uint256 gasLimit;       // 目标链上调用的 gas 限制
    bool isArbitraryCall;   // 是否为任意调用（true）或认证调用（false）
}

/**
 * @dev 回滚选项结构体
 * 用于处理跨链交易失败的情况
 */
struct RevertOptions {
    address revertAddress;     // 接收退款的地址
    bool callOnRevert;         // 是否在回滚时调用 onRevert 函数
    address abortAddress;      // 如果回滚也失败，接收资产的地址
    bytes revertMessage;       // 传递给 onRevert 的消息
    uint256 onRevertGasLimit;  // onRevert 函数的 gas 限制
}

/**
 * @dev 回滚上下文结构体
 * onRevert 函数接收的参数
 */
struct RevertContext {
    address asset;           // ZRC-20 代币地址
    uint64 amount;           // 金额
    bytes revertMessage;     // 回滚消息
}

/**
 * @dev 中止上下文结构体
 * onAbort 函数接收的参数
 */
struct AbortContext {
    bytes sender;            // 原始发送者
    address asset;           // 资产地址
    uint256 amount;          // 金额
    bool outgoing;           // 是否为出站交易
    uint256 chainID;         // 链 ID
    bytes revertMessage;     // 消息
}

/**
 * @dev ZetaChain Gateway 接口（ZEVM 版本）
 * 用于从 ZetaChain 向连接的链发起调用和取款
 */
interface IGatewayZEVM {
    // 取款 ZRC-20 代币到连接链
    function withdraw(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        RevertOptions calldata revertOptions
    ) external;
    
    // 取款并调用连接链上的合约
    function withdrawAndCall(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external;
    
    // 调用连接链上的合约（不带代币）
    function call(
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        CallOptions calldata callOptions,
        RevertOptions calldata revertOptions
    ) external;
}

/**
 * @dev Universal Contract 接口
 * 所有 ZetaChain Universal App 必须实现此接口
 */
interface UniversalContract {
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external;
}

/**
 * @dev Revertable 接口
 * 用于处理跨链交易回滚
 */
interface Revertable {
    function onRevert(RevertContext calldata revertContext) external;
}

/**
 * @dev Abortable 接口
 * 用于处理回滚失败的情况
 */
interface Abortable {
    function onAbort(AbortContext calldata abortContext) external;
}

// ============================================================================
// ERC-721 标准接口和实现（内联版本）
// ============================================================================

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

// ============================================================================
// 工具库
// ============================================================================

library Strings {
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
// ============================================================================
// Base64 库 (新增) - 用于将 JSON 转换为浏览器可读格式
// ============================================================================
library Base64 {
    string internal constant _TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = _TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for { let i := 0 } lt(i, mload(data)) { i := add(i, 3) } {
                let input := and(mload(add(add(data, 32), i)), 0xFFFFFF)
                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(input, 0x3F))), 0xFF))
                out := shl(224, out)
                mstore(resultPtr, out)
                resultPtr := add(resultPtr, 4)
            }
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
        }
        return result;
    }
}
// ============================================================================
// 主合约：ZetaSaveCrossChain
// ============================================================================

/**
 * @title ZetaSaveCrossChain
 * @notice 跨链储蓄合约，支持从多条链存款并在达到里程碑时铸造 NFT 奖励
 * @dev 实现 UniversalContract 接口，支持 ZetaChain Gateway 调用
 */
contract ZetaSaveCrossChain is UniversalContract, Revertable, Abortable, IERC721, IERC721Metadata {
    using Strings for uint256;
    
    // ========================================================================
    // 常量定义
    // ========================================================================
    
    /// @notice ZetaChain Athens Testnet Gateway 地址
    address public constant GATEWAY = 0x6c533f7fE93fAE114d0954697069Df33C9B74fD7;
    
    /// @notice 支持的 ZRC-20 代币地址（Athens Testnet）
    address public constant ETH_SEPOLIA_ETH = 0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0;
    address public constant BASE_SEPOLIA_ETH = 0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD;
    address public constant ETH_SEPOLIA_USDC = 0xcC683A782f4B30c138787CB5576a86AF66fdc31d;
    address public constant BASE_SEPOLIA_USDC = 0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19;
    // IPFS 图片链接
    string constant IMG_50_PERCENT = "ipfs://bafybeidjcgqgolkjyhcezurig5h4azundsgjlx5aqeo5ka26lpdalxfz7i"; 
    string constant IMG_100_PERCENT = "ipfs://bafybeidjcgqgolkjyhcezurig5h4azundsgjlx5aqeo5ka26lpdalxfz7i";
    /// @notice 链 ID 常量
    uint256 public constant ETH_SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;
    
    // ========================================================================
    // 数据结构
    // ========================================================================
    
    /**
     * @notice 储蓄计划结构体
     * @param zrc20Token ZRC-20 代币地址
     * @param targetAmount 目标金额
     * @param currentAmount 当前已存金额
     * @param startTime 计划开始时间
     * @param savingsGoal 储蓄目标描述
     * @param isActive 计划是否激活
     * @param milestone50Claimed 是否已领取 50% 里程碑 NFT
     * @param milestone100Claimed 是否已领取 100% 里程碑 NFT
     * @param sourceChainId 记录来源链以便取款
     */
    struct SavingsPlan {
        address zrc20Token;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 startTime;
        string savingsGoal;
        bool isActive;
        bool milestone50Claimed;
        bool milestone100Claimed;
        uint256 sourceChainId;
    }
    
    /**
     * @notice NFT 元数据结构体
     * @param milestonePercent 里程碑百分比（50 或 100）
     * @param achievementDate 达成日期时间戳
     * @param savingsAmount 达成时的储蓄金额
     * @param tokenAddress ZRC-20 代币地址
     * @param goalDescription 目标描述
     */
    struct NFTMetadata {
        uint256 milestonePercent;
        uint256 achievementDate;
        uint256 savingsAmount;
        address tokenAddress;
        string goalDescription;
    }
    
    // ========================================================================
    // 状态变量
    // ========================================================================
    
    /// @notice 合约所有者
    address public owner;
    
    /// @notice 用户地址 => 计划ID => 储蓄计划
    mapping(address => mapping(uint256 => SavingsPlan)) public userPlans;
    
    /// @notice 用户地址 => 计划数量
    mapping(address => uint256) public userPlanCount;
    
    /// @notice NFT Token ID => 元数据
    mapping(uint256 => NFTMetadata) public nftMetadata;
    
    /// @notice 用户地址 => NFT Token ID 数组
    mapping(address => uint256[]) public userNFTs;
    
    /// @notice 当前 NFT Token ID
    uint256 private _nextTokenId;
    
    /// @notice 支持的 ZRC-20 代币映射
    mapping(address => bool) public supportedTokens;
    
    /// @notice ZRC-20 代币对应的链 ID
    mapping(address => uint256) public tokenChainId;
    
    // ERC-721 相关存储
    string private _name;
    string private _symbol;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    
    // ========================================================================
    // 事件定义
    // ========================================================================
    
    /// @notice 跨链存款事件
    event CrossChainDeposit(
        address indexed user, 
        address indexed zrc20, 
        uint256 amount, 
        uint256 sourceChainId
    );
    
    /// @notice 跨链取款事件
    event CrossChainWithdraw(
        address indexed user, 
        address indexed zrc20, 
        uint256 amount, 
        bytes recipient
    );
    
    /// @notice 计划创建事件
    event PlanCreated(
        address indexed user, 
        uint256 planId, 
        address zrc20, 
        uint256 targetAmount
    );
    
    /// @notice 存款事件
    event DepositMade(
        address indexed user, 
        uint256 planId, 
        uint256 amount, 
        uint256 newTotal
    );
    
    /// @notice 里程碑达成事件
    event MilestoneReached(
        address indexed user, 
        uint256 planId, 
        uint256 milestonePercent, 
        uint256 nftId
    );
    
    /// @notice 取款事件
    event WithdrawalMade(
        address indexed user, 
        uint256 planId, 
        uint256 amount
    );
    
    /// @notice 回滚接收事件
    event RevertReceived(
        address indexed user, 
        uint256 planId, 
        uint256 amount
    );
    
    /// @notice 中止事件
    event AbortReceived(
        address indexed asset,
        uint256 amount,
        bytes revertMessage
    );
    
    // ========================================================================
    // 修饰符
    // ========================================================================
    
    /**
     * @notice 仅 Gateway 可调用
     * @dev 确保 onCall 只能由 Gateway 调用
     */
    modifier onlyGateway() {
        require(msg.sender == GATEWAY, "Only Gateway can call");
        _;
    }
    
    /**
     * @notice 仅所有者可调用
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    // ========================================================================
    // 构造函数
    // ========================================================================
    
    /**
     * @notice 合约构造函数
     * @dev 初始化支持的代币和 NFT 元数据
     */
    constructor() {
        owner = msg.sender;
        _name = "ZetaSave Achievement";
        _symbol = "ZSAVE";
        _nextTokenId = 1;
        
        // 初始化支持的代币
        supportedTokens[ETH_SEPOLIA_ETH] = true;
        supportedTokens[BASE_SEPOLIA_ETH] = true;
        supportedTokens[ETH_SEPOLIA_USDC] = true;
        supportedTokens[BASE_SEPOLIA_USDC] = true;
        
        // 设置代币对应的链 ID
        tokenChainId[ETH_SEPOLIA_ETH] = ETH_SEPOLIA_CHAIN_ID;
        tokenChainId[ETH_SEPOLIA_USDC] = ETH_SEPOLIA_CHAIN_ID;
        tokenChainId[BASE_SEPOLIA_ETH] = BASE_SEPOLIA_CHAIN_ID;
        tokenChainId[BASE_SEPOLIA_USDC] = BASE_SEPOLIA_CHAIN_ID;
    }
    
    // ========================================================================
    // 核心函数：跨链存款入口
    // ========================================================================
    
    /**
     * @notice 跨链调用入口函数（由 Gateway 调用）
     * @dev 处理来自连接链的存款和计划创建
     * @param context 消息上下文，包含发送者地址和源链 ID
     * @param zrc20 ZRC-20 代币地址
     * @param amount 存款金额
     * @param message 编码的消息数据
     *        - opType=0: 创建新计划 abi.encode(uint8(0), uint256(targetAmount), string(savingsGoal))
     *        - opType=1: 向现有计划存款 abi.encode(uint8(1), uint256(planId), string(""))
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        // 验证代币是否支持
        require(supportedTokens[zrc20], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        // 解码用户地址（从 bytes 转换为 address）
        address user = _bytesToAddress(context.sender);
        
        // 解码操作类型和参数
        (uint8 opType, uint256 param, string memory goalStr) = abi.decode(
            message, 
            (uint8, uint256, string)
        );
        
        // 发出跨链存款事件
        emit CrossChainDeposit(user, zrc20, amount, context.chainID);
        
        if (opType == 0) {
            // 操作类型 0：创建新储蓄计划
            _createPlan(user, zrc20, param, goalStr, amount, context.chainID);
        } else if (opType == 1) {
            // 操作类型 1：向现有计划存款
            _depositToPlan(user, param, amount);
        } else {
            revert("Invalid operation type");
        }
    }
    
    // ========================================================================
    // 核心函数：跨链取款
    // ========================================================================
    
    /**
     * @notice 跨链取款函数
     * @dev 将资金取回到源链
     * @param planId 计划 ID
     * @param amount 取款金额
     * @param recipient 接收者地址（abi.encodePacked(address)）
     */
    function withdraw(
        uint256 planId,
        uint256 amount,
        bytes calldata recipient
    ) external {
        SavingsPlan storage plan = userPlans[msg.sender][planId];
        
        require(plan.isActive, "Plan not active");
        require(plan.currentAmount >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");
        
        address zrc20 = plan.zrc20Token;
        
        // 获取 gas 费用信息
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20).withdrawGasFee();
        
        // 确保有足够的金额支付 gas 费用
        require(amount > gasFee, "Amount must be greater than gas fee");
        
        // 更新计划余额
        plan.currentAmount -= amount;
        
        // 计算实际取款金额（扣除 gas 费用）
        uint256 withdrawAmount = amount - gasFee;
        
        // 批准 Gateway 使用 gas 费用
        IZRC20(gasZRC20).approve(GATEWAY, gasFee);
        
        // 批准 Gateway 使用取款代币
        IZRC20(zrc20).approve(GATEWAY, withdrawAmount);
        
        // 设置回滚选项
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(msg.sender, planId, amount),
            onRevertGasLimit: 200000
        });
        
        // 执行跨链取款
        IGatewayZEVM(GATEWAY).withdraw(
            recipient,
            withdrawAmount,
            zrc20,
            revertOptions
        );
        
        emit CrossChainWithdraw(msg.sender, zrc20, withdrawAmount, recipient);
        emit WithdrawalMade(msg.sender, planId, amount);
    }
    
    // ========================================================================
    // 回滚处理函数
    // ========================================================================
    
    /**
     * @notice 处理跨链交易回滚
     * @dev 当取款失败时，将资金退还到用户的储蓄计划
     * @param revertContext 回滚上下文
     */
    function onRevert(RevertContext calldata revertContext) external override onlyGateway {
        // 解码回滚消息
        (address user, uint256 planId, uint256 amount) = abi.decode(
            revertContext.revertMessage,
            (address, uint256, uint256)
        );
        
        // 将资金退还到用户计划
        if (userPlans[user][planId].isActive) {
            userPlans[user][planId].currentAmount += amount;
        }
        
        emit RevertReceived(user, planId, amount);
    }
    
    /**
     * @notice 处理中止情况
     * @dev 当回滚也失败时调用
     * @param abortContext 中止上下文
     */
    function onAbort(AbortContext calldata abortContext) external override onlyGateway {
        emit AbortReceived(
            abortContext.asset,
            abortContext.amount,
            abortContext.revertMessage
        );
    }
    
    // ========================================================================
    // 内部函数
    // ========================================================================
    
    /**
     * @notice 创建新储蓄计划
     * @param user 用户地址
     * @param zrc20 ZRC-20 代币地址
     * @param targetAmount 目标金额
     * @param savingsGoal 储蓄目标描述
     * @param initialDeposit 初始存款金额
     * @param sourceChainId 源链 ID
     */
    function _createPlan(
        address user,
        address zrc20,
        uint256 targetAmount,
        string memory savingsGoal,
        uint256 initialDeposit,
        uint256 sourceChainId
    ) internal {
        require(targetAmount > 0, "Target must be greater than 0");
        
        uint256 planId = userPlanCount[user];
        
        userPlans[user][planId] = SavingsPlan({
            zrc20Token: zrc20,
            targetAmount: targetAmount,
            currentAmount: initialDeposit,
            startTime: block.timestamp,
            savingsGoal: savingsGoal,
            isActive: true,
            milestone50Claimed: false,
            milestone100Claimed: false,
            sourceChainId: sourceChainId
        });
        
        userPlanCount[user]++;
        
        emit PlanCreated(user, planId, zrc20, targetAmount);
        emit DepositMade(user, planId, initialDeposit, initialDeposit);
        
        // 检查是否达到里程碑
        _checkAndMintMilestoneNFT(user, planId);
    }
    
    /**
     * @notice 向现有计划存款
     * @param user 用户地址
     * @param planId 计划 ID
     * @param amount 存款金额
     */
    function _depositToPlan(
        address user,
        uint256 planId,
        uint256 amount
    ) internal {
        SavingsPlan storage plan = userPlans[user][planId];
        
        require(plan.isActive, "Plan not active");
        require(plan.currentAmount + amount <= plan.targetAmount * 2, "Exceeds max deposit");
        
        plan.currentAmount += amount;
        
        emit DepositMade(user, planId, amount, plan.currentAmount);
        
        // 检查是否达到里程碑
        _checkAndMintMilestoneNFT(user, planId);
    }
    
    /**
     * @notice 检查并铸造里程碑 NFT
     * @dev 当用户达到 50% 或 100% 目标时铸造 NFT
     * @param user 用户地址
     * @param planId 计划 ID
     */
    function _checkAndMintMilestoneNFT(address user, uint256 planId) internal {
        SavingsPlan storage plan = userPlans[user][planId];
        
        uint256 progress = (plan.currentAmount * 100) / plan.targetAmount;
        
        // 检查 50% 里程碑
        if (progress >= 50 && !plan.milestone50Claimed) {
            plan.milestone50Claimed = true;
            uint256 tokenId = _mintNFT(user, planId, 50, plan);
            emit MilestoneReached(user, planId, 50, tokenId);
        }
        
        // 检查 100% 里程碑
        if (progress >= 100 && !plan.milestone100Claimed) {
            plan.milestone100Claimed = true;
            uint256 tokenId = _mintNFT(user, planId, 100, plan);
            emit MilestoneReached(user, planId, 100, tokenId);
        }
    }
    
    /**
     * @notice 铸造里程碑 NFT
     * @param user 用户地址
     * @param planId 计划 ID（未使用但保留以供将来扩展）
     * @param milestonePercent 里程碑百分比
     * @param plan 储蓄计划
     * @return tokenId 新铸造的 NFT Token ID
     */
    function _mintNFT(
        address user,
        uint256 planId,
        uint256 milestonePercent,
        SavingsPlan storage plan
    ) internal returns (uint256) {
        // 避免 planId 未使用警告
        planId;
        
        uint256 tokenId = _nextTokenId++;
        
        _owners[tokenId] = user;
        _balances[user]++;
        
        nftMetadata[tokenId] = NFTMetadata({
            milestonePercent: milestonePercent,
            achievementDate: block.timestamp,
            savingsAmount: plan.currentAmount,
            tokenAddress: plan.zrc20Token,
            goalDescription: plan.savingsGoal
        });
        
        userNFTs[user].push(tokenId);
        
        emit Transfer(address(0), user, tokenId);
        
        return tokenId;
    }
    
    /**
     * @notice 将 bytes 转换为 address
     * @param data bytes 数据
     * @return 转换后的地址
     */
    function _bytesToAddress(bytes memory data) internal pure returns (address) {
        require(data.length >= 20, "Invalid address length");
        address addr;
        assembly {
            addr := mload(add(data, 20))
        }
        return addr;
    }
    
    // ========================================================================
    // 查询函数
    // ========================================================================
    
    /**
     * @notice 获取用户的储蓄计划
     * @param user 用户地址
     * @param planId 计划 ID
     * @return 储蓄计划详情
     */
    function getUserPlan(address user, uint256 planId) external view returns (SavingsPlan memory) {
        return userPlans[user][planId];
    }
    
    /**
     * @notice 获取用户所有 NFT
     * @param user 用户地址
     * @return NFT Token ID 数组
     */
    function getUserNFTs(address user) external view returns (uint256[] memory) {
        return userNFTs[user];
    }
    
    /**
     * @notice 获取 NFT 元数据
     * @param tokenId NFT Token ID
     * @return NFT 元数据
     */
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return nftMetadata[tokenId];
    }
    
    /**
     * @notice 计算储蓄进度百分比
     * @param user 用户地址
     * @param planId 计划 ID
     * @return 进度百分比（0-100+）
     */
    function getProgress(address user, uint256 planId) external view returns (uint256) {
        SavingsPlan storage plan = userPlans[user][planId];
        if (plan.targetAmount == 0) return 0;
        return (plan.currentAmount * 100) / plan.targetAmount;
    }
    
    /**
     * @notice 检查代币是否支持
     * @param token 代币地址
     * @return 是否支持
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }
    
    // ========================================================================
    // ERC-721 实现
    // ========================================================================
    
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
    
    function name() public view virtual override returns (string memory) {
        return _name;
    }
    
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }
    // ========================================================================
    // 辅助函数 (翻译官)
    // ========================================================================
    /**
     * @notice 根据 ZRC20 地址获取资产描述
     * @dev 把冷冰冰的地址翻译成人类能看懂的文字
     */
    function _getAssetDescription(address zrc20) internal pure returns (string memory chain, string memory assetSymbol) {
        if (zrc20 == BASE_SEPOLIA_USDC) {
            return ("Base Sepolia", "USDC");
        } else if (zrc20 == ETH_SEPOLIA_USDC) {
            return ("ETH Sepolia", "USDC");
        } else if (zrc20 == BASE_SEPOLIA_ETH) {
            return ("Base Sepolia", "ETH");
        } else if (zrc20 == ETH_SEPOLIA_ETH) {
            return ("ETH Sepolia", "ETH");
        } else {
            return ("Unknown Chain", "Unknown Asset");
        }
    }

   // [最终版] 包含全链信息的动态 Metadata
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        
        // 1. 获取链上数据
        NFTMetadata memory metadata = nftMetadata[tokenId];
        
        // 2. 调用翻译官，获取具体的链名和币种
        (string memory chainName, string memory assetSymbol) = _getAssetDescription(metadata.tokenAddress);
        
        // 3. 根据进度选择图片 (保持不变)
        string memory imageURI = metadata.milestonePercent == 100 ? IMG_100_PERCENT : IMG_50_PERCENT;

        // 4. 拼装增强版 JSON
        bytes memory dataURI = abi.encodePacked(
            '{',
                '"name": "ZetaSave ', assetSymbol, ' Saver",', // 名字也动态化了，比如 "ZetaSave USDC Saver"
                '"description": "Achievement badge for omnichain savings on ZetaChain.",',
                '"image": "', imageURI, '",',
                '"attributes": [',
                    // 原有的属性
                    '{"trait_type": "Milestone", "value": "', metadata.milestonePercent.toString(), '%"},',
                    '{"trait_type": "Savings Amount", "value": "', metadata.savingsAmount.toString(), '"},',
                    
                    // [新增] 链和资产属性 —— 这就是你想要的！
                    '{"trait_type": "Chain", "value": "', chainName, '"},',
                    '{"trait_type": "Asset", "value": "', assetSymbol, '"},',
                    
                    '{"trait_type": "Goal", "value": "', metadata.goalDescription, '"},',
                    '{"trait_type": "Date", "display_type": "date", "value": "', metadata.achievementDate.toString(), '"}',
                ']',
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }
    
    function balanceOf(address _owner) public view virtual override returns (uint256) {
        require(_owner != address(0), "Address zero is not valid");
        return _balances[_owner];
    }
    
    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }
    
    function approve(address to, uint256 tokenId) public virtual override {
        address tokenOwner = ownerOf(tokenId);
        require(to != tokenOwner, "Cannot approve to current owner");
        require(
            msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender),
            "Not authorized"
        );
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }
    
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }
    
    function setApprovalForAll(address operator, bool approved) public virtual override {
        require(operator != msg.sender, "Cannot set approval for self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function isApprovedForAll(address _owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[_owner][operator];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Transfer to non ERC721Receiver");
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || getApproved(tokenId) == spender || isApprovedForAll(tokenOwner, spender));
    }
    
    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Transfer from incorrect owner");
        require(to != address(0), "Transfer to zero address");
        
        delete _tokenApprovals[tokenId];
        
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer to non ERC721Receiver");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }
    
    // ========================================================================
    // 管理函数
    // ========================================================================
    
    /**
     * @notice 添加支持的代币
     * @param token 代币地址
     * @param chainId 对应的链 ID
     */
    function addSupportedToken(address token, uint256 chainId) external onlyOwner {
        supportedTokens[token] = true;
        tokenChainId[token] = chainId;
    }
    
    /**
     * @notice 移除支持的代币
     * @param token 代币地址
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }
    
    /**
     * @notice 转移合约所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        owner = newOwner;
    }
    
    // ========================================================================
    // 直接存款函数（用于 ZetaChain 本地调用）
    // ========================================================================
    
    /**
     * @notice 直接创建储蓄计划（从 ZetaChain 直接调用）
     * @param zrc20 ZRC-20 代币地址
     * @param targetAmount 目标金额
     * @param savingsGoal 储蓄目标描述
     * @param initialDeposit 初始存款金额
     */
    function createPlanDirect(
        address zrc20,
        uint256 targetAmount,
        string calldata savingsGoal,
        uint256 initialDeposit
    ) external {
        require(supportedTokens[zrc20], "Token not supported");
        require(initialDeposit > 0, "Initial deposit required");
        
        // 转移代币到合约
        require(
            IZRC20(zrc20).transferFrom(msg.sender, address(this), initialDeposit),
            "Transfer failed"
        );
        
        _createPlan(
            msg.sender,
            zrc20,
            targetAmount,
            savingsGoal,
            initialDeposit,
            tokenChainId[zrc20]
        );
    }
    
    /**
     * @notice 直接向计划存款（从 ZetaChain 直接调用）
     * @param planId 计划 ID
     * @param amount 存款金额
     */
    function depositDirect(uint256 planId, uint256 amount) external {
        SavingsPlan storage plan = userPlans[msg.sender][planId];
        require(plan.isActive, "Plan not active");
        
        // 转移代币到合约
        require(
            IZRC20(plan.zrc20Token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        _depositToPlan(msg.sender, planId, amount);
    }
    
    /**
     * @notice 关闭计划（仅限所有者）
     * @param planId 计划 ID
     */
    function closePlan(uint256 planId) external {
        SavingsPlan storage plan = userPlans[msg.sender][planId];
        require(plan.isActive, "Plan not active");
        
        plan.isActive = false;
    }
    
    // ========================================================================
    // 接收 ETH（用于可能的 gas 退款）
    // ========================================================================
    
    receive() external payable {}
}
