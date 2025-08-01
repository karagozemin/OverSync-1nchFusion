const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Manual MainnetHTLC Deploy (workaround)...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with:", deployer.address);
  
  // Get balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("❌ No ETH balance!");
    process.exit(1);
  }

  try {
    // Get contract factory
    const MainnetHTLC = await ethers.getContractFactory("MainnetHTLC");
    
    console.log("📦 Starting deployment...");
    
    // Deploy WITHOUT waiting
    const deployTx = await MainnetHTLC.deploy();
    const txHash = deployTx.deploymentTransaction().hash;
    
    console.log("✅ Deployment transaction sent!");
    console.log("📝 TX Hash:", txHash);
    console.log("🔗 Etherscan:", `https://etherscan.io/tx/${txHash}`);
    
    console.log("⏳ Waiting for confirmation (manual)...");
    console.log("💡 Check Etherscan for deployment status");
    console.log("📍 Contract address will be available after confirmation");
    
    // Manual address calculation (CREATE2 veya CREATE)
    const nonce = await deployer.getNonce() - 1;
    const predictedAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: nonce
    });
    
    console.log("🔮 Predicted Contract Address:", predictedAddress);
    console.log("\n🔧 Update your relayer config:");
    console.log(`   htlcBridge: '${predictedAddress}' // Add to mainnet config`);
    
  } catch (error) {
    console.error("❌ Deploy failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Deployment process completed!");
    console.log("🔍 Monitor Etherscan for confirmation");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });