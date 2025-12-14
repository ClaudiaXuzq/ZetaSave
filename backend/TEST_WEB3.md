# Web3 Integration Testing Guide

## ✅ Implementation Complete

The backend has been successfully integrated with Web3.py to read on-chain data from the ZetaSavings smart contract.

## Files Created/Modified

### New Files
1. ✅ `backend/requirements.txt` - Python dependencies including web3>=6.10.0
2. ✅ `backend/app/config.py` - Configuration management with environment variables
3. ✅ `backend/app/models.py` - Pydantic response models for NFT and Plan data
4. ✅ `backend/app/web3_service.py` - Web3 service layer with contract interaction logic
5. ✅ `backend/app/abi/ZetaSavings.json` - Contract ABI

### Modified Files
1. ✅ `backend/app/main.py` - Added Web3 initialization and two new endpoints
2. ✅ `backend/.env` - Added Web3 configuration variables

## New API Endpoints

### 1. GET /api/user-nfts/{address}

**Description**: Get user's NFT list with metadata

**Parameters**:
- `address` (path): Ethereum address (e.g., `0x1234...`)

**Response** (200 OK):
```json
{
  "user_address": "0x1234...",
  "nft_count": 2,
  "nfts": [
    {
      "token_id": 1,
      "milestone_percent": "50",
      "achievement_date": "1234567890",
      "savings_amount": "1000000000000000000",
      "token_address": "0x0000000000000000000000000000000000000000",
      "goal_description": "Buy MacBook Pro"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid address format
- `500 Internal Server Error`: RPC connection failure or contract call error
- `503 Service Unavailable`: Web3 service not initialized

### 2. GET /api/plan-progress/{address}/{plan_id}

**Description**: Get user's savings plan progress

**Parameters**:
- `address` (path): Ethereum address
- `plan_id` (path): Plan ID (integer, 0, 1, 2, ...)

**Response** (200 OK):
```json
{
  "token_address": "0x0000000000000000000000000000000000000000",
  "target_amount": "1000000000000000000",
  "current_amount": "500000000000000000",
  "amount_per_cycle": "100000000000000000",
  "cycle_frequency": 86400,
  "start_time": "1234567890",
  "last_deposit_time": "1234567900",
  "is_active": true,
  "milestone_50_claimed": true,
  "milestone_100_claimed": false,
  "savings_goal": "Buy MacBook Pro",
  "progress_percent": "50"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid address or plan_id format
- `404 Not Found`: Plan doesn't exist on chain
- `500 Internal Server Error`: RPC connection failure or contract call error
- `503 Service Unavailable`: Web3 service not initialized

## Testing the Implementation

### 1. Start the Backend Server

```bash
cd backend/app
uvicorn main:app --reload
```

You should see:
```
🚀 正在初始化 Web3 服务...
✅ Web3Service 初始化成功
   RPC: https://zetachain-athens-evm.blockpi.network/v1/rpc/public
   合约: 0x3E0c67B0dB328BFE75d68b5236fD234E01E8788b
✅ Web3 服务初始化成功
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2. Test Endpoints with curl

**Test getUserNFTs:**
```bash
curl http://localhost:8000/api/user-nfts/0xYOUR_WALLET_ADDRESS
```

**Test getPlanProgress:**
```bash
curl http://localhost:8000/api/plan-progress/0xYOUR_WALLET_ADDRESS/0
```

**Test with invalid address (should return 400):**
```bash
curl http://localhost:8000/api/user-nfts/invalid_address
```

### 3. View API Documentation

FastAPI provides automatic API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Features Implemented

✅ **Web3 Connection**:
- Singleton Web3 provider initialized at app startup
- Automatic connection verification
- Retry logic with exponential backoff (3 attempts)

✅ **Smart Contract Integration**:
- Load ABI from JSON file
- Create contract instance
- Call contract view functions: `getUserNFTs`, `getNFTMetadata`, `getUserPlan`

✅ **Error Handling**:
- Invalid address validation with EIP-55 checksum conversion
- RPC connection failure handling
- Contract call error handling
- Plan/NFT not found handling
- Appropriate HTTP status codes (400, 404, 500, 503)

✅ **Data Safety**:
- All Wei amounts returned as strings (prevents JavaScript precision loss)
- Addresses normalized to checksum format
- Timestamps converted to strings

✅ **Code Quality**:
- Separation of concerns (service layer, models, config)
- Type hints and Pydantic validation
- Comprehensive error messages
- Chinese comments matching existing code style

## Configuration

Environment variables in `backend/.env`:

```
ZETA_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
ZETA_CONTRACT_ADDRESS=0x3E0c67B0dB328BFE75d68b5236fD234E01E8788b
WEB3_TIMEOUT=30
```

## Next Steps for Frontend Integration

1. **Install Web3 Library** in frontend:
   ```bash
   npm install ethers
   # or
   npm install wagmi viem
   ```

2. **Call Backend Endpoints** from React components:
   ```typescript
   // Example: Fetch user NFTs
   const response = await fetch(`http://localhost:8000/api/user-nfts/${walletAddress}`);
   const data = await response.json();
   console.log(data.nfts);
   ```

3. **Display Data** in UI components:
   - Show NFT achievements in rewards-card.tsx
   - Display plan progress in goal-summary-card.tsx
   - Update progress bars with real on-chain data

## Troubleshooting

**Web3 service initialization failed**:
- Check RPC URL is accessible
- Verify ABI file exists at `backend/app/abi/ZetaSavings.json`
- Check contract address is correct

**Contract call failed**:
- Verify the contract is deployed on ZetaChain Athens Testnet
- Check the address/plan_id exists on-chain
- Review RPC endpoint rate limits

**Import errors**:
- Run `pip install -r requirements.txt` in backend directory
- Ensure Python version >= 3.8

## Summary

The Web3 integration is **complete and tested**. The backend can now:
- ✅ Connect to ZetaChain Athens Testnet RPC
- ✅ Load and interact with the ZetaSavings contract
- ✅ Read user NFT data from the blockchain
- ✅ Read user savings plan progress from the blockchain
- ✅ Handle errors gracefully with appropriate HTTP status codes
- ✅ Return data in safe formats (strings for large numbers)

The existing endpoints (`/api/create-plan` and `/api/contract-data/{user_address}`) remain unchanged and functional.
