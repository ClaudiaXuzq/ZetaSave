// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZetaSavings - Remix部署版本
 * @dev 包含NFT里程碑奖励的储蓄合约
 * 
 * 部署说明:
 * 1. 在Remix中打开此文件
 * 2. 编译器版本选择 0.8.20 或以上
 * 3. 部署到ZetaChain网络
 * 4. 无需构造函数参数
 */

// ============================================
// OpenZeppelin 依赖 (内联版本)
// ============================================

/**
 * @dev Interface of the ERC165 standard
 */
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
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

/**
 * @dev Interface for ERC20
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @dev String operations.
 */
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

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}

/**
 * @title ERC721 Token Receiver
 */
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

/**
 * @dev Implementation of ERC165
 */
abstract contract ERC165 is IERC165 {
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

/**
 * @dev Context - provides information about the current execution context
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**
 * @dev Contract module which provides a basic access control mechanism
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**
 * @dev Contract module that helps prevent reentrant calls
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @dev Implementation of ERC721 Non-Fungible Token Standard
 */
contract ERC721 is Context, ERC165, IERC721 {
    using Address for address;
    using Strings for uint256;

    string private _name;
    string private _symbol;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function balanceOf(address owner) public view virtual override returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view virtual returns (string memory) {
        _requireMinted(tokenId);
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721.ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");
        require(_msgSender() == owner || isApprovedForAll(owner, _msgSender()), "ERC721: approve caller is not token owner or approved for all");
        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        _requireMinted(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _ownerOf(uint256 tokenId) internal view virtual returns (address) {
        return _owners[tokenId];
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        address owner = ERC721.ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    function _safeMint(address to, uint256 tokenId, bytes memory data) internal virtual {
        _mint(to, tokenId);
        require(_checkOnERC721Received(address(0), to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual {
        address owner = ERC721.ownerOf(tokenId);
        _approve(address(0), tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal virtual {
        require(ERC721.ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ERC721.ownerOf(tokenId), to, tokenId);
    }

    function _setApprovalForAll(address owner, address operator, bool approved) internal virtual {
        require(owner != operator, "ERC721: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _requireMinted(uint256 tokenId) internal view virtual {
        require(_exists(tokenId), "ERC721: invalid token ID");
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.isContract()) {
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
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
}

// ============================================
// ZetaSavings 主合约
// ============================================

/**
 * @title ZetaSavings
 * @dev 带有NFT里程碑奖励的跨链储蓄合约
 * 
 * NFT铸造规则:
 * - 渐进式储蓄 (0%→50%→100%): 获得2个NFT (50% + 100%)
 * - 一次性达成 (0%→100%): 只获得1个100% NFT
 * - 每个里程碑只能领取一次
 */
contract ZetaSavings is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    
    // NFT token ID计数器
    uint256 private _tokenIdCounter;
    
    // 储蓄计划结构
    struct SavingsPlan {
        address user;                    // 用户地址
        address tokenAddress;            // 储蓄代币地址 (0x0 = 原生代币)
        uint256 targetAmount;            // 目标金额
        uint256 currentAmount;           // 当前已存金额
        uint256 amountPerCycle;          // 每周期存款金额
        uint256 cycleFrequency;          // 周期频率(秒)
        uint256 startTime;               // 开始时间
        uint256 lastDepositTime;         // 最后存款时间
        bool active;                     // 计划是否激活
        bool milestone50Claimed;         // 50%里程碑是否已领取
        bool milestone100Claimed;        // 100%里程碑是否已领取
        string savingsGoal;              // 储蓄目标描述
    }
    
    // NFT元数据结构
    struct NFTMetadata {
        uint256 milestonePercent;        // 里程碑百分比(50或100)
        uint256 achievementDate;         // 达成日期
        uint256 savingsAmount;           // 储蓄金额
        address tokenAddress;            // 代币地址
        string goalDescription;          // 目标描述
    }
    
    // 用户地址 => 计划ID => 储蓄计划
    mapping(address => mapping(uint256 => SavingsPlan)) public savingsPlans;
    // 用户地址 => 计划数量
    mapping(address => uint256) public userPlanCount;
    // NFT ID => NFT元数据
    mapping(uint256 => NFTMetadata) public nftMetadata;
    // 用户地址 => NFT ID数组
    mapping(address => uint256[]) public userNFTs;
    
    // 事件
    event PlanCreated(address indexed user, uint256 planId, uint256 targetAmount, address tokenAddress);
    event DepositMade(address indexed user, uint256 planId, uint256 amount, uint256 newTotal);
    event WithdrawalMade(address indexed user, uint256 planId, uint256 amount);
    event MilestoneReached(address indexed user, uint256 planId, uint256 milestonePercent, uint256 nftId);
    event PlanCompleted(address indexed user, uint256 planId, uint256 finalAmount);
    
    constructor() ERC721("ZetaSave Milestone NFT", "ZSMILE") {}
    
    /**
     * @dev 创建新的储蓄计划
     */
    function createSavingsPlan(
        address tokenAddress,
        uint256 targetAmount,
        uint256 amountPerCycle,
        uint256 cycleFrequency,
        string memory savingsGoal
    ) external returns (uint256) {
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(amountPerCycle > 0, "Amount per cycle must be greater than 0");
        require(cycleFrequency > 0, "Cycle frequency must be greater than 0");
        
        uint256 planId = userPlanCount[msg.sender];
        
        savingsPlans[msg.sender][planId] = SavingsPlan({
            user: msg.sender,
            tokenAddress: tokenAddress,
            targetAmount: targetAmount,
            currentAmount: 0,
            amountPerCycle: amountPerCycle,
            cycleFrequency: cycleFrequency,
            startTime: block.timestamp,
            lastDepositTime: 0,
            active: true,
            milestone50Claimed: false,
            milestone100Claimed: false,
            savingsGoal: savingsGoal
        });
        
        userPlanCount[msg.sender]++;
        
        emit PlanCreated(msg.sender, planId, targetAmount, tokenAddress);
        return planId;
    }
    
    /**
     * @dev 存款到储蓄计划
     */
    function deposit(uint256 planId, uint256 amount) external payable nonReentrant {
        SavingsPlan storage plan = savingsPlans[msg.sender][planId];
        require(plan.active, "Plan is not active");
        require(plan.user == msg.sender, "Not your plan");
        require(amount > 0, "Amount must be greater than 0");
        
        // 处理代币转账
        if (plan.tokenAddress == address(0)) {
            // 原生代币(ETH/ZETA等)
            require(msg.value == amount, "Incorrect native token amount");
        } else {
            // ERC20代币
            require(msg.value == 0, "Do not send native token for ERC20 deposits");
            IERC20(plan.tokenAddress).transferFrom(msg.sender, address(this), amount);
        }
        
        // 更新计划状态
        uint256 previousAmount = plan.currentAmount;
        plan.currentAmount += amount;
        plan.lastDepositTime = block.timestamp;
        
        emit DepositMade(msg.sender, planId, amount, plan.currentAmount);
        
        // 检查并铸造里程碑NFT
        _checkAndMintMilestoneNFT(msg.sender, planId, previousAmount, plan.currentAmount);
        
        // 检查是否完成目标
        if (plan.currentAmount >= plan.targetAmount) {
            emit PlanCompleted(msg.sender, planId, plan.currentAmount);
        }
    }
    
    /**
     * @dev 从储蓄计划提款
     */
    function withdraw(uint256 planId, uint256 amount) external nonReentrant {
        SavingsPlan storage plan = savingsPlans[msg.sender][planId];
        require(plan.user == msg.sender, "Not your plan");
        require(amount > 0, "Amount must be greater than 0");
        require(plan.currentAmount >= amount, "Insufficient balance");
        
        plan.currentAmount -= amount;
        
        // 转账
        if (plan.tokenAddress == address(0)) {
           (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(plan.tokenAddress).transfer(msg.sender, amount);
        }
        
        emit WithdrawalMade(msg.sender, planId, amount);
    }
    
    /**
     * @dev 关闭储蓄计划
     */
    function closePlan(uint256 planId) external {
        SavingsPlan storage plan = savingsPlans[msg.sender][planId];
        require(plan.user == msg.sender, "Not your plan");
        require(plan.active, "Plan already closed");
        
        plan.active = false;
        
        // 退还剩余金额
        if (plan.currentAmount > 0) {
            uint256 amount = plan.currentAmount;
            plan.currentAmount = 0;
            
            if (plan.tokenAddress == address(0)) {
                (bool success, ) = msg.sender.call{value: amount}("");
                require(success, "Transfer failed");
            } else {
                IERC20(plan.tokenAddress).transfer(msg.sender, amount);
            }
        }
    }
    
    /**
     * @dev 检查并铸造里程碑NFT
     * 逻辑:
     * - 如果从<50%到>=50%且<100%: 只发50% NFT
     * - 如果从<50%直接到>=100%: 只发100% NFT (跳过50%)
     * - 如果从>=50%到>=100%: 只发100% NFT
     */
    function _checkAndMintMilestoneNFT(
        address user,
        uint256 planId,
        uint256 previousAmount,
        uint256 currentAmount
    ) private {
        SavingsPlan storage plan = savingsPlans[user][planId];
        uint256 targetAmount = plan.targetAmount;
        
        // 计算达成百分比
        uint256 previousPercent = (previousAmount * 100) / targetAmount;
        uint256 currentPercent = (currentAmount * 100) / targetAmount;
        
        // 情况1: 直接达到或超过100% -> 只发100% NFT
        if (previousPercent < 100 && currentPercent >= 100 && !plan.milestone100Claimed) {
            _mintMilestoneNFT(user, planId, 100, currentAmount);
            plan.milestone100Claimed = true;
            // 标记50%也已领取，避免后续重复
            plan.milestone50Claimed = true;
        }
        // 情况2: 达到50%但未到100% -> 只发50% NFT
        else if (previousPercent < 50 && currentPercent >= 50 && currentPercent < 100 && !plan.milestone50Claimed) {
            _mintMilestoneNFT(user, planId, 50, currentAmount);
            plan.milestone50Claimed = true;
        }
    }
    
    /**
     * @dev 铸造里程碑NFT
     */
    function _mintMilestoneNFT(
        address user,
        uint256 planId,
        uint256 milestonePercent,
        uint256 savingsAmount
    ) private {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        SavingsPlan storage plan = savingsPlans[user][planId];
        
        // 存储NFT元数据
        nftMetadata[tokenId] = NFTMetadata({
            milestonePercent: milestonePercent,
            achievementDate: block.timestamp,
            savingsAmount: savingsAmount,
            tokenAddress: plan.tokenAddress,
            goalDescription: plan.savingsGoal
        });
        
        // 记录用户NFT
        userNFTs[user].push(tokenId);
        
        // 铸造NFT
        _safeMint(user, tokenId);
        
        emit MilestoneReached(user, planId, milestonePercent, tokenId);
    }
    
    /**
     * @dev 获取用户的储蓄计划详情
     */
    function getUserPlan(address user, uint256 planId) 
        external 
        view 
        returns (
            address tokenAddress,
            uint256 targetAmount,
            uint256 currentAmount,
            uint256 amountPerCycle,
            uint256 cycleFrequency,
            uint256 startTime,
            uint256 lastDepositTime,
            bool active,
            bool milestone50Claimed,
            bool milestone100Claimed,
            string memory savingsGoal,
            uint256 progressPercent
        ) 
    {
        SavingsPlan storage plan = savingsPlans[user][planId];
        
        return (
            plan.tokenAddress,
            plan.targetAmount,
            plan.currentAmount,
            plan.amountPerCycle,
            plan.cycleFrequency,
            plan.startTime,
            plan.lastDepositTime,
            plan.active,
            plan.milestone50Claimed,
            plan.milestone100Claimed,
            plan.savingsGoal,
            plan.targetAmount > 0 ? (plan.currentAmount * 100) / plan.targetAmount : 0
        );
    }
    
    /**
     * @dev 获取计划进度百分比
     */
    function getPlanProgress(address user, uint256 planId) external view returns (uint256) {
        SavingsPlan storage plan = savingsPlans[user][planId];
        return plan.targetAmount > 0 ? (plan.currentAmount * 100) / plan.targetAmount : 0;
    }
    
    /**
     * @dev 获取用户的所有NFT
     */
    function getUserNFTs(address user) external view returns (uint256[] memory) {
        return userNFTs[user];
    }
    
    /**
     * @dev 获取NFT的元数据
     */
    function getNFTMetadata(uint256 tokenId) 
        external 
        view 
        returns (
            uint256 milestonePercent,
            uint256 achievementDate,
            uint256 savingsAmount,
            address tokenAddress,
            string memory goalDescription
        ) 
    {
        NFTMetadata storage m = nftMetadata[tokenId];
        return (m.milestonePercent, m.achievementDate, m.savingsAmount, m.tokenAddress, m.goalDescription);
    }
    
    /**
     * @dev 重写tokenURI以支持动态元数据
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        return string(abi.encodePacked(
            "https://api.zetasave.io/nft/",
            tokenId.toString(),
            "?milestone=",
            nftMetadata[tokenId].milestonePercent.toString()
        ));
    }
    
    /**
     * @dev 支持接收原生代币
     */
    receive() external payable {}
}
