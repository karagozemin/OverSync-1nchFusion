import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);
  
  console.log('💰 Mainnet Balance:', ethers.formatEther(balance), 'ETH');
  console.log('📍 Address:', deployer.address);
  
  const balanceNum = parseFloat(ethers.formatEther(balance));
  
  if (balance === 0n) {
    console.log('❌ NO ETH BALANCE!');
    console.log('🚨 Cannot deploy to mainnet without ETH');
    console.log('💡 Send ETH to:', deployer.address);
    return false;
  } else if (balanceNum < 0.01) {
    console.log('⚠️  LOW BALANCE!');
    console.log('💡 Recommended: 0.01-0.02 ETH for deployment');
    return false;
  } else {
    console.log('✅ Sufficient balance for mainnet deployment');
    return true;
  }
}

main().catch(console.error);