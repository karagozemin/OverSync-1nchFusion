import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying HTLCBridge Contract to Ethereum Mainnet...");
  console.log("=====================================================");

  // Get the deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("❌ No signers available! Please check your private key configuration.");
    process.exit(1);
  }
  const deployer = signers[0];
  console.log("👤 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ No ETH balance! Please fund your account:");
    console.error("📧 Address:", deployer.address);
    console.error("⚠️  WARNING: This is ETHEREUM MAINNET - requires real ETH!");
    process.exit(1);
  }

  // Safety check for mainnet
  console.log("⚠️  MAINNET DEPLOYMENT - Are you sure? (This costs real ETH)");  
  console.log("📍 Target Network: Ethereum Mainnet (Chain ID: 1)");
  console.log("💰 Estimated gas cost: ~0.01-0.02 ETH");
  
  // Deploy HTLCBridge contract
  console.log("\n📦 Deploying HTLCBridge...");
  const HTLCBridge = await ethers.getContractFactory("HTLCBridge");
  
  // Deploy with conservative gas settings for low balance
  const htlcBridge = await HTLCBridge.deploy({
    gasLimit: 3000000, // 3M gas limit (lower)
    gasPrice: ethers.parseUnits("2", "gwei") // 2 Gwei (lower)
  });
  
  console.log("⏳ Waiting for deployment...");
  await htlcBridge.waitForDeployment();
  
  const contractAddress = await htlcBridge.getAddress();
  console.log("✅ HTLCBridge deployed to:", contractAddress);
  
  // Display deployment information
  console.log("\n📋 Deployment Summary:");
  console.log("======================");
  console.log("🔗 Network: Ethereum Mainnet");
  console.log("📍 Contract Address:", contractAddress);
  console.log("👤 Deployer:", deployer.address);
  console.log("🔗 Explorer:", `https://etherscan.io/address/${contractAddress}`);
  
  // Update environment variable suggestion
  console.log("\n🔧 Next Steps:");
  console.log("==============");
  console.log("1. Update your .env file:");
  console.log(`   HTLC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("2. Verify on Etherscan:");
  console.log(`   npx hardhat verify --network mainnet ${contractAddress}`);
  console.log("");
  console.log("3. Update relayer/src/index.ts NETWORK_CONFIG:");
  console.log(`   htlcBridge: '${contractAddress}' // Add to mainnet config`);
  console.log("");
  console.log("4. Restart relayer service with new contract address");
  
  return contractAddress;
}

main()
  .then((contractAddress) => {
    console.log(`\n🎉 MAINNET Deployment successful!`);
    console.log(`📍 HTLCBridge Contract: ${contractAddress}`);
    console.log(`🔗 Etherscan: https://etherscan.io/address/${contractAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ MAINNET Deployment failed:", error);
    process.exit(1);
  });