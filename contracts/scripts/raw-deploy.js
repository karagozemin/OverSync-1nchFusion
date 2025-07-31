const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

async function main() {
  console.log("🚀 RAW Deployment to Ethereum Mainnet...");
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  
  console.log("👤 Deploying with:", wallet.address);
  
  // Get balance
  const balance = await wallet.provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  // Read contract artifacts
  const artifactPath = path.join(__dirname, '../artifacts/contracts/HTLCBridge.sol/HTLCBridge.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  console.log("📋 Contract artifact loaded");
  
  // Create contract factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("⚡ Deploying contract...");
  
  try {
    // Deploy with simple settings
    const contract = await factory.deploy();
    console.log("📤 Transaction sent:", contract.deploymentTransaction().hash);
    
    // Wait for deployment
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log("✅ SUCCESS!");
    console.log("📍 Contract Address:", address);
    console.log("🔗 Etherscan:", `https://etherscan.io/address/${address}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    if (error.transaction) {
      console.log("📤 Transaction hash:", error.transaction.hash);
    }
  }
}

main().catch(console.error);