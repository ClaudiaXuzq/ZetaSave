// Script to register supported ZRC-20 tokens in the ZetaSaveCrossChain contract
// Run with: npx ts-node scripts/registerTokens.ts

import { ethers } from "ethers";

const ZETASAVE_CONTRACT = "0x9BE8A2541A047E9A48d0626d64CF73d8f17D95DD";
const RPC_URL = "https://zetachain-athens-evm.blockpi.network/v1/rpc/public";

// Supported tokens
const TOKENS = [
  {
    address: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
    name: "ETH Sepolia ETH",
    chainId: 11155111,
  },
  {
    address: "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD",
    name: "Base Sepolia ETH",
    chainId: 84532,
  },
  {
    address: "0xcC683A782f4B30c138787CB5576a86AF66fdc31d",
    name: "ETH Sepolia USDC",
    chainId: 11155111,
  },
  {
    address: "0xd0eFed75622e7AA4555EE44F296dA3744E3ceE19",
    name: "Base Sepolia USDC",
    chainId: 84532,
  },
];

const ABI = [
  "function addSupportedToken(address token, uint256 chainId) external",
  "function isTokenSupported(address token) external view returns (bool)",
  "function owner() external view returns (address)",
];

async function main() {
  // You need to provide your private key here
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    throw new Error("Please set PRIVATE_KEY environment variable");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(ZETASAVE_CONTRACT, ABI, wallet);

  console.log("Registering tokens on ZetaSaveCrossChain contract...");
  console.log("Contract:", ZETASAVE_CONTRACT);
  console.log("Your address:", wallet.address);

  // Check if you're the owner
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("You are not the contract owner!");
  }

  for (const token of TOKENS) {
    console.log(`\nChecking ${token.name} (${token.address})...`);

    const isSupported = await contract.isTokenSupported(token.address);
    if (isSupported) {
      console.log(`✅ Already registered`);
      continue;
    }

    console.log(`⏳ Registering...`);
    const tx = await contract.addSupportedToken(token.address, token.chainId);
    console.log(`Transaction sent: ${tx.hash}`);

    await tx.wait();
    console.log(`✅ Registered successfully!`);
  }

  console.log("\n🎉 All tokens registered!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
