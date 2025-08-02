import { ethers } from "hardhat";

async function main() {
  console.log("🔐 Authorizing Relayer for HTLC Contract...");
  
  const [owner] = await ethers.getSigners();
  console.log("👤 Owner:", owner.address);
  
  // Contract address
  const contractAddress = "0x3f344ACDd17a0c4D21096da895152820f595dc8A";
  const relayerAddress = process.env.RELAYER_ETH_ADDRESS || "YOUR_ETH_ADDRESS_HERE";
  
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