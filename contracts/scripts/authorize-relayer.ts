import { ethers } from "hardhat";

async function main() {
  console.log("🔐 Authorizing Relayer for HTLC Contract...");
  
  const [owner] = await ethers.getSigners();
  console.log("👤 Owner:", owner.address);
  
  // Contract address
  const contractAddress = "0x8535C03f3e744Cf569B71AC0b5Fdd8a7589B24Df";
  const relayerAddress = "0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e";
  
  // Get contract instance
  const htlcBridge = await ethers.getContractAt("HTLCBridge", contractAddress);
  
  console.log("📋 Contract:", contractAddress);
  console.log("🤖 Relayer:", relayerAddress);
  
  // Check current authorization
  const isCurrentlyAuthorized = await htlcBridge.authorizedResolvers(relayerAddress);
  console.log("🔍 Currently authorized:", isCurrentlyAuthorized);
  
  if (!isCurrentlyAuthorized) {
    console.log("🚀 Authorizing relayer...");
    const tx = await htlcBridge.setAuthorizedResolver(relayerAddress, true);
    console.log("⏳ Waiting for transaction...");
    await tx.wait();
    console.log("✅ Relayer authorized successfully!");
  } else {
    console.log("✅ Relayer already authorized!");
  }
  
  // Verify authorization
  const finalCheck = await htlcBridge.authorizedResolvers(relayerAddress);
  console.log("🎯 Final status:", finalCheck);
  
  console.log("\n🎉 Authorization complete!");
}

main()
  .then(() => {
    console.log("🏆 Relayer ready for HTLC operations!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Authorization failed:", error);
    process.exit(1);
  }); 