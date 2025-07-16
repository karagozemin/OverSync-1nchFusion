import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying HTLCBridge Contract to Sepolia...");
  console.log("===============================================");

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
    console.error("🌊 Sepolia Faucet: https://sepoliafaucet.com/");
    process.exit(1);
  }

  // Deploy HTLCBridge contract
  console.log("\n📦 Deploying HTLCBridge...");
  const HTLCBridge = await ethers.getContractFactory("HTLCBridge");
  const htlcBridge = await HTLCBridge.deploy();
  
  console.log("⏳ Waiting for deployment...");
  await htlcBridge.waitForDeployment();
  
  const contractAddress = await htlcBridge.getAddress();
  console.log("✅ HTLCBridge deployed to:", contractAddress);
  
  // Display deployment information
  console.log("\n📋 Deployment Summary:");
  console.log("======================");
  console.log("🔗 Network: Sepolia Testnet");
  console.log("📍 Contract Address:", contractAddress);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Gas Used: (will be shown after deployment)");
  
  // Update environment variable suggestion
  console.log("\n🔧 Next Steps:");
  console.log("==============");
  console.log("1. Update your .env file:");
  console.log(`   HTLC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("2. Verify on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
  console.log("");
  console.log("3. Fund your relayer account with testnet ETH");
  console.log("4. Start the relayer service: pnpm relayer:start");
  
  return contractAddress;
}

main()
  .then((contractAddress) => {
    console.log(`\n🎉 Deployment successful! Contract: ${contractAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 