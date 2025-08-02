import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying ONLY EscrowFactory to Sepolia");
  console.log("==========================================");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("📋 Configuration:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`   Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  
  // Deploy EscrowFactory ONLY
  console.log("\n🔨 Deploying EscrowFactory...");
  const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
  
  console.log("📊 Contract size info:");
  const contractCode = EscrowFactory.bytecode;
  console.log(`   Bytecode size: ${contractCode.length / 2} bytes`);
  
  try {
    const escrowFactory = await EscrowFactory.deploy({
      gasLimit: 8000000, // Very high gas limit
      gasPrice: ethers.parseUnits("15", "gwei") // Higher gas price
    });
    
    console.log("   ⏳ Waiting for deployment...");
    await escrowFactory.waitForDeployment();
    const address = await escrowFactory.getAddress();
    
    console.log(`   ✅ EscrowFactory deployed at: ${address}`);
    
    // Test basic functionality
    console.log("\n🔍 Testing contract...");
    try {
      const owner = await escrowFactory.owner();
      console.log(`   Owner: ${owner}`);
      console.log("   ✅ Contract is functional!");
    } catch (testError) {
      console.log("   ⚠️ Contract deployed but test failed:", testError);
    }
    
    console.log("\n📋 SUMMARY:");
    console.log("==========================================");
    console.log(`EscrowFactory Address: ${address}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Network: Sepolia (Chain ID: ${(await ethers.provider.getNetwork()).chainId})`);
    console.log(`Etherscan: https://sepolia.etherscan.io/address/${address}`);
    
    return { escrowFactory: address };
    
  } catch (deployError: any) {
    console.error("❌ EscrowFactory deployment failed:", deployError.message);
    
    if (deployError.receipt) {
      console.log("📊 Transaction details:");
      console.log(`   Gas used: ${deployError.receipt.gasUsed}`);
      console.log(`   Gas limit: ${deployError.receipt.gasLimit || 'unknown'}`);
      console.log(`   Status: ${deployError.receipt.status}`);
    }
    
    throw deployError;
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});