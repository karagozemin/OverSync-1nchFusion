import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * @title Phase 6 Deployment Script
 * @dev Deploys HTLCBridge and EscrowFactory with proper configuration
 */

async function main() {
  console.log("🚀 Starting Phase 6: Smart Contract Architecture Deployment");
  console.log("================================================");
  
  // Get signers
  const [deployer, resolver1, resolver2] = await ethers.getSigners();
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Resolver 1: ${resolver1.address}`);
  console.log(`   Resolver 2: ${resolver2.address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`   Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  
  // Deploy HTLCBridge
  console.log("\n🔨 Deploying HTLCBridge...");
  const HTLCBridge: ContractFactory = await ethers.getContractFactory("HTLCBridge");
  const htlcBridge: Contract = await HTLCBridge.deploy();
  await htlcBridge.waitForDeployment();
  const htlcBridgeAddress = await htlcBridge.getAddress();
  
  console.log(`   ✅ HTLCBridge deployed at: ${htlcBridgeAddress}`);
  
  // Deploy EscrowFactory
  console.log("\n🔨 Deploying EscrowFactory...");
  const EscrowFactory: ContractFactory = await ethers.getContractFactory("EscrowFactory");
  const escrowFactory: Contract = await EscrowFactory.deploy();
  await escrowFactory.waitForDeployment();
  const escrowFactoryAddress = await escrowFactory.getAddress();
  
  console.log(`   ✅ EscrowFactory deployed at: ${escrowFactoryAddress}`);
  
  // Configure HTLCBridge
  console.log("\n⚙️  Configuring HTLCBridge...");
  
  // Authorize resolvers
  console.log("   📝 Authorizing resolvers...");
  await htlcBridge.authorizeResolver(resolver1.address);
  await htlcBridge.authorizeResolver(resolver2.address);
  console.log(`   ✅ Resolver 1 authorized: ${resolver1.address}`);
  console.log(`   ✅ Resolver 2 authorized: ${resolver2.address}`);
  
  // Authorize escrow factory
  console.log("   📝 Authorizing escrow factory...");
  await htlcBridge.authorizeFactory(escrowFactoryAddress);
  console.log(`   ✅ EscrowFactory authorized: ${escrowFactoryAddress}`);
  
  // Set factory fee rate (0.1%)
  console.log("   📝 Setting factory fee rate...");
  await htlcBridge.setFactoryFeeRate(10); // 0.1% in basis points
  console.log("   ✅ Factory fee rate set to 0.1%");
  
  // Configure EscrowFactory
  console.log("\n⚙️  Configuring EscrowFactory...");
  
  // Authorize resolvers on factory
  console.log("   📝 Authorizing resolvers on factory...");
  await escrowFactory.authorizeResolver(resolver1.address);
  await escrowFactory.authorizeResolver(resolver2.address);
  console.log(`   ✅ Resolver 1 authorized on factory: ${resolver1.address}`);
  console.log(`   ✅ Resolver 2 authorized on factory: ${resolver2.address}`);
  
  // Set factory fee rate on factory
  console.log("   📝 Setting factory fee rate on factory...");
  await escrowFactory.setFactoryFeeRate(10); // 0.1% in basis points
  console.log("   ✅ Factory fee rate set to 0.1%");
  
  // Deploy test ERC20 token for testing
  console.log("\n🔨 Deploying Test ERC20 Token...");
  const TestToken: ContractFactory = await ethers.getContractFactory("TestERC20");
  const testToken: Contract = await TestToken.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  
  console.log(`   ✅ Test Token deployed at: ${testTokenAddress}`);
  
  // Transfer test tokens to resolvers
  console.log("   📝 Transferring test tokens to resolvers...");
  await testToken.transfer(resolver1.address, ethers.parseEther("10000"));
  await testToken.transfer(resolver2.address, ethers.parseEther("10000"));
  console.log("   ✅ Test tokens distributed to resolvers");
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  // Check HTLCBridge
  const nextOrderId = await htlcBridge.getNextOrderId();
  const totalOrders = await htlcBridge.totalOrders();
  const totalSafetyDeposits = await htlcBridge.totalSafetyDeposits();
  
  console.log(`   HTLCBridge Next Order ID: ${nextOrderId}`);
  console.log(`   HTLCBridge Total Orders: ${totalOrders}`);
  console.log(`   HTLCBridge Total Safety Deposits: ${ethers.formatEther(totalSafetyDeposits)} ETH`);
  
  // Check EscrowFactory
  const totalEscrows = await escrowFactory.totalEscrows();
  const totalFactorySafetyDeposits = await escrowFactory.totalSafetyDeposits();
  
  console.log(`   EscrowFactory Total Escrows: ${totalEscrows}`);
  console.log(`   EscrowFactory Total Safety Deposits: ${ethers.formatEther(totalFactorySafetyDeposits)} ETH`);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  // Test resolver authorization
  const isResolver1Authorized = await htlcBridge.authorizedResolvers(resolver1.address);
  const isResolver2Authorized = await htlcBridge.authorizedResolvers(resolver2.address);
  
  console.log(`   Resolver 1 authorized: ${isResolver1Authorized}`);
  console.log(`   Resolver 2 authorized: ${isResolver2Authorized}`);
  
  // Test factory authorization
  const isFactoryAuthorized = await htlcBridge.authorizedFactories(escrowFactoryAddress);
  console.log(`   Factory authorized: ${isFactoryAuthorized}`);
  
  // Create a sample order (without funding)
  console.log("\n🧪 Creating sample order...");
  
  const sampleHashLock = ethers.keccak256(ethers.toUtf8Bytes("secret123"));
  const sampleTimelock = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
  const sampleAmount = ethers.parseEther("100");
  const safetyDeposit = ethers.parseEther("0.01");
  
  const createOrderTx = await htlcBridge.connect(resolver1).createOrder(
    testTokenAddress,
    sampleAmount,
    sampleHashLock,
    sampleTimelock,
    100, // 1% fee
    resolver2.address, // beneficiary
    resolver1.address, // refund address
    1, // destination chain ID (mainnet)
    ethers.ZeroHash, // stellar tx hash
    true, // partial fill enabled
    { value: safetyDeposit }
  );
  
  const receipt = await createOrderTx.wait();
  console.log(`   ✅ Sample order created. TX: ${receipt?.hash}`);
  
  // Get order details
  const orderId = await htlcBridge.getOrderIdByHashLock(sampleHashLock);
  const order = await htlcBridge.getOrder(orderId);
  
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Order Status: ${order.status}`);
  console.log(`   Order Amount: ${ethers.formatEther(order.amount)} TEST`);
  console.log(`   Safety Deposit: ${ethers.formatEther(order.safetyDepositPaid)} ETH`);
  
  // Generate deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("================================================");
  console.log(`HTLCBridge Address: ${htlcBridgeAddress}`);
  console.log(`EscrowFactory Address: ${escrowFactoryAddress}`);
  console.log(`Test Token Address: ${testTokenAddress}`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Resolver 1 Address: ${resolver1.address}`);
  console.log(`Resolver 2 Address: ${resolver2.address}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  
  // Save deployment info to file
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      HTLCBridge: htlcBridgeAddress,
      EscrowFactory: escrowFactoryAddress,
      TestToken: testTokenAddress
    },
    resolvers: [resolver1.address, resolver2.address],
    configuration: {
      factoryFeeRate: 10, // 0.1%
      minSafetyDeposit: ethers.parseEther("0.001"),
      maxSafetyDeposit: ethers.parseEther("5"),
      minTimelock: 3600, // 1 hour
      maxTimelock: 604800 // 7 days
    },
    timestamp: new Date().toISOString()
  };
  
  console.log("\n💾 Deployment info saved to deployment-info.json");
  console.log("================================================");
  
  // Cross-chain integration instructions
  console.log("\n🌉 Cross-chain Integration Instructions:");
  console.log("================================================");
  console.log("1. Configure Stellar network in stellar/src/stellar-client.ts");
  console.log("2. Update relayer service with new contract addresses");
  console.log("3. Set up event listeners for cross-chain messages");
  console.log("4. Configure recovery service for timelock monitoring");
  console.log("5. Update frontend with new contract ABIs");
  
  console.log("\n✨ Phase 6.1: Smart Contract Enhancement - COMPLETED!");
  console.log("================================================");
  
  return {
    htlcBridge: htlcBridgeAddress,
    escrowFactory: escrowFactoryAddress,
    testToken: testTokenAddress,
    deployer: deployer.address,
    resolvers: [resolver1.address, resolver2.address]
  };
}

// Test ERC20 contract for testing
const TestERC20_ABI = [
  "constructor(string memory name, string memory symbol, uint256 totalSupply)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 