import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Calculating Relayer Address...");
  
  const privateKey = process.env.RELAYER_PRIVATE_KEY || ""; // NEVER hardcode private keys!
  const wallet = new ethers.Wallet(privateKey);
  
  console.log("✅ Relayer Address:", wallet.address);
  console.log("📝 Checksum:", ethers.getAddress(wallet.address));
  
  return wallet.address;
}

main()
  .then((address) => {
    console.log("🎯 Use this address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 