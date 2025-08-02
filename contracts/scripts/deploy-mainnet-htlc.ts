import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying MainnetHTLC Contract to Ethereum Mainnet...");
  console.log("========================================================");

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
  const balanceInEth = ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInEth, "ETH");
  
  if (balance === 0n) {
    console.error("❌ No ETH balance! Please fund your account:");
    console.error("📧 Address:", deployer.address);
    console.error("⚠️  WARNING: This is ETHEREUM MAINNET - requires real ETH!");
    process.exit(1);
  }

  // Balance check bypassed for deployment
  console.log("💡 Balance check bypassed - proceeding with deployment...");

  // Safety check for mainnet
  console.log("⚠️  MAINNET DEPLOYMENT - This will cost real ETH!");  
  console.log("📍 Target Network: Ethereum Mainnet (Chain ID: 1)");
  console.log("💰 Estimated gas cost: ~0.002-0.005 ETH");
  
  try {
    // Deploy MainnetHTLC contract with optimized settings
    console.log("\n📦 Deploying MainnetHTLC...");
    const MainnetHTLC = await ethers.getContractFactory("MainnetHTLC");
    
    // Get current gas price from network
    const feeData = await deployer.provider.getFeeData();
    console.log("⛽ Current gas price:", ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "gwei");
    
    // Deploy with current network gas price but reduced gas limit
    const mainnetHTLC = await MainnetHTLC.deploy({
      gasLimit: 2000000, // 2M gas limit (reduced for simplicity)
    });
    
    console.log("⏳ Waiting for deployment transaction...");
    const deploymentTx = mainnetHTLC.deploymentTransaction();
    if (deploymentTx) {
      console.log("📝 Deployment tx hash:", deploymentTx.hash);
      console.log("⏳ Waiting for confirmation...");
    }
    
    await mainnetHTLC.waitForDeployment();
    
    const contractAddress = await mainnetHTLC.getAddress();
    console.log("✅ MainnetHTLC deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    
    // Verify deployment by calling a view function
    try {
      const minTimelock = await mainnetHTLC.minTimelock();
      console.log("🔍 Contract verification: minTimelock =", minTimelock.toString(), "seconds");
    } catch (error) {
      console.warn("⚠️  Could not verify contract deployment");
    }
    
    // Display deployment information
    console.log("\n📋 Deployment Summary:");
    console.log("======================");
    console.log("🔗 Network: Ethereum Mainnet");
    console.log("📍 Contract Address:", contractAddress);
    console.log("👤 Deployer:", deployer.address);
    console.log("🔗 Etherscan:", `https://etherscan.io/address/${contractAddress}`);
    
    // Calculate gas cost
    if (deploymentTx) {
      const receipt = await deploymentTx.wait();
      if (receipt) {
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.gasPrice || feeData.gasPrice || 0n;
        const gasCost = gasUsed * gasPrice;
        console.log("⛽ Gas Used:", gasUsed.toString());
        console.log("💰 Gas Cost:", ethers.formatEther(gasCost), "ETH");
        
        const finalBalance = await deployer.provider.getBalance(deployer.address);
        console.log("💰 Remaining Balance:", ethers.formatEther(finalBalance), "ETH");
      }
    }
    
    // Next steps
    console.log("\n🔧 Next Steps:");
    console.log("==============");
    console.log("1. Update your .env file:");
    console.log(`   MAINNET_HTLC_ADDRESS=${contractAddress}`);
    console.log("");
    console.log("2. Verify contract on Etherscan:");
    console.log(`   npx hardhat verify --network mainnet ${contractAddress}`);
    console.log("");
    console.log("3. Update relayer configuration:");
    console.log(`   htlcBridge: '${contractAddress}' // Add to mainnet config`);
    console.log("");
    console.log("4. Test with small amounts first!");
    
    return contractAddress;
    
  } catch (error: any) {
    console.error("❌ Deployment failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.error("💡 Solution: Add more ETH to your account");
      console.error("📧 Address:", deployer.address);
    } else if (error.message.includes("gas")) {
      console.error("💡 Solution: Try adjusting gas settings or wait for lower gas prices");
    } else if (error.message.includes("nonce")) {
      console.error("💡 Solution: Check if there are pending transactions");
    }
    
    throw error;
  }
}

main()
  .then((contractAddress) => {
    console.log(`\n🎉 MAINNET Deployment completed successfully!`);
    console.log(`📍 MainnetHTLC Contract: ${contractAddress}`);
    console.log(`🔗 Etherscan: https://etherscan.io/address/${contractAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ MAINNET Deployment failed:", error.message);
    process.exit(1);
  });