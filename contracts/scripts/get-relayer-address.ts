import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Calculating Relayer Address...");
  
  const privateKey = "0xf38c811b61dc42e9b2dfa664d2ae2302c4958b5ff6ab607186b70e76e86802a6";
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