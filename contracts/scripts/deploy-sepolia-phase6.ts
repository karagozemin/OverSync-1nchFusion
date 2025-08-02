import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import * as fs from 'fs';

/**
 * @title Phase 6.2 Sepolia Deployment Script
 * @dev Deploys HTLCBridge and EscrowFactory to Sepolia testnet
 */

async function main() {
  console.log("🚀 Starting Phase 6.2: Sepolia Testnet Deployment");
  console.log("================================================");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("📋 Deployment Configuration:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`   Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.001 ETH.");
  }
  
  // Deploy HTLCBridge
  console.log("\n🔨 Deploying HTLCBridge to Sepolia...");
  const HTLCBridge: ContractFactory = await ethers.getContractFactory("HTLCBridge");
  const htlcBridge: Contract = await HTLCBridge.deploy({
    gasLimit: 3000000,
    gasPrice: ethers.parseUnits("5", "gwei")
  });
  
  console.log("   ⏳ Waiting for deployment...");
  await htlcBridge.waitForDeployment();
  const htlcBridgeAddress = await htlcBridge.getAddress();
  
  console.log(`   ✅ HTLCBridge deployed at: ${htlcBridgeAddress}`);
  console.log(`   ⏳ Waiting for confirmations...`);
  
  // Wait for confirmations
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Deploy EscrowFactory
  console.log("\n🔨 Deploying EscrowFactory to Sepolia...");
  const EscrowFactory: ContractFactory = await ethers.getContractFactory("EscrowFactory");
  const escrowFactory: Contract = await EscrowFactory.deploy({
    gasLimit: 6000000, // Double the gas limit
    gasPrice: ethers.parseUnits("10", "gwei") // Increase gas price
  });
  
  console.log("   ⏳ Waiting for deployment...");
  await escrowFactory.waitForDeployment();
  const escrowFactoryAddress = await escrowFactory.getAddress();
  
  console.log(`   ✅ EscrowFactory deployed at: ${escrowFactoryAddress}`);
  console.log(`   ⏳ Waiting for confirmations...`);
  
  // Wait for confirmations
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Deploy TestERC20
  console.log("\n🔨 Deploying TestERC20 to Sepolia...");
  const TestToken: ContractFactory = await ethers.getContractFactory("TestERC20");
  const testToken: Contract = await TestToken.deploy(
    "Fusion Test Token",
    "FTEST",
    ethers.parseEther("1000000"),
    {
      gasLimit: 1000000,
      gasPrice: ethers.parseUnits("5", "gwei")
    }
  );
  
  console.log("   ⏳ Waiting for deployment...");
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  
  console.log(`   ✅ TestERC20 deployed at: ${testTokenAddress}`);
  console.log(`   ⏳ Waiting for confirmations...`);
  
  // Wait for confirmations
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Authorize deployer as resolver
  console.log("   📝 Authorizing deployer as resolver...");
  await htlcBridge.authorizeResolver(deployer.address, {
    gasLimit: 100000,
    gasPrice: ethers.parseUnits("5", "gwei")
  });
  
  // Authorize escrow factory
  console.log("   📝 Authorizing escrow factory...");
    await htlcBridge.authorizeFactory(escrowFactoryAddress, {
    gasLimit: 100000,
    gasPrice: ethers.parseUnits("5", "gwei")
  });

  // Configure factory
  console.log("   📝 Configuring factory...");
  await escrowFactory.authorizeResolver(deployer.address, {
    gasLimit: 100000,
    gasPrice: ethers.parseUnits("5", "gwei")
  });
  
  // Wait for configuration confirmations
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  const nextOrderId = await htlcBridge.getNextOrderId();
  const totalOrders = await htlcBridge.totalOrders();
  const totalSafetyDeposits = await htlcBridge.totalSafetyDeposits();
  const isResolverAuthorized = await htlcBridge.authorizedResolvers(deployer.address);
  const isFactoryAuthorized = await htlcBridge.authorizedFactories(escrowFactoryAddress);
  
  console.log(`   HTLCBridge Next Order ID: ${nextOrderId}`);
  console.log(`   HTLCBridge Total Orders: ${totalOrders}`);
  console.log(`   HTLCBridge Total Safety Deposits: ${ethers.formatEther(totalSafetyDeposits)} ETH`);
  console.log(`   Deployer authorized as resolver: ${isResolverAuthorized}`);
  console.log(`   Factory authorized: ${isFactoryAuthorized}`);
  
  // Generate deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    contracts: {
      HTLCBridge: htlcBridgeAddress,
      EscrowFactory: escrowFactoryAddress,
      TestToken: testTokenAddress
    },
    configuration: {
      factoryFeeRate: 10, // 0.1%
      minSafetyDeposit: ethers.parseEther("0.001"),
      maxSafetyDeposit: ethers.parseEther("5"),
      minTimelock: 3600, // 1 hour
      maxTimelock: 604800 // 7 days
    },
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };
  
  // Save deployment info
  fs.writeFileSync(
    './deployment-sepolia-phase6.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📋 Sepolia Deployment Summary:");
  console.log("================================================");
  console.log(`HTLCBridge Address: ${htlcBridgeAddress}`);
  console.log(`EscrowFactory Address: ${escrowFactoryAddress}`);
  console.log(`TestToken Address: ${testTokenAddress}`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Network: Sepolia`);
  console.log(`Chain ID: 11155111`);
  console.log(`Block Number: ${await ethers.provider.getBlockNumber()}`);
  
  console.log("\n🔗 Etherscan Links:");
  console.log(`HTLCBridge: https://sepolia.etherscan.io/address/${htlcBridgeAddress}`);
  console.log(`EscrowFactory: https://sepolia.etherscan.io/address/${escrowFactoryAddress}`);
  console.log(`TestToken: https://sepolia.etherscan.io/address/${testTokenAddress}`);
  
  console.log("\n🛠️  Contract Verification:");
  console.log("Run the following commands to verify contracts:");
  console.log(`npx hardhat verify --network sepolia ${htlcBridgeAddress}`);
  console.log(`npx hardhat verify --network sepolia ${escrowFactoryAddress}`);
  console.log(`npx hardhat verify --network sepolia ${testTokenAddress} "Fusion Test Token" "FTEST" "1000000000000000000000000"`);
  
  console.log("\n🌟 Stellar Integration:");
  console.log("================================================");
  console.log("1. Configure Stellar testnet in stellar/src/stellar-client.ts");
  console.log("2. Update relayer with Sepolia contract addresses");
  console.log("3. Set up cross-chain message handling");
  console.log("4. Test end-to-end cross-chain swaps");
  
  console.log("\n✨ Phase 6.2: Sepolia Deployment - COMPLETED!");
  console.log("================================================");
  
  return {
    htlcBridge: htlcBridgeAddress,
    escrowFactory: escrowFactoryAddress,
    testToken: testTokenAddress,
    deployer: deployer.address,
    network: "sepolia",
    chainId: 11155111
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("❌ Sepolia deployment failed:", error);
  process.exitCode = 1;
}); 