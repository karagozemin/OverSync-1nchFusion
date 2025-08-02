/**
 * @fileoverview Relayer service for FusionBridge cross-chain operations
 * @description Monitors Ethereum events and coordinates Stellar transactions
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ethers } from 'ethers';

// Load environment variables from root directory
config({ path: resolve(process.cwd(), '../.env') });

// ✅ NETWORK-AWARE Dynamic Safety Deposit Helper Function
function calculateDynamicSafetyDeposit(amountInWei: string | bigint, networkMode?: string): bigint {
  const ETH_USD_PRICE = 3500; // $3500 per ETH
  const amountInEth = parseFloat(ethers.formatEther(amountInWei.toString()));
  const amountInUsd = amountInEth * ETH_USD_PRICE;
  
  // ✅ Your preferred dynamic calculation
  let safetyDepositInEth: number;
  if (amountInUsd <= 50) {
    safetyDepositInEth = 0.00005; // min
  } else if (amountInUsd <= 100) {
    safetyDepositInEth = 0.0001;
  } else if (amountInUsd <= 500) {
    safetyDepositInEth = 0.0002;
  } else if (amountInUsd <= 1000) {
    safetyDepositInEth = 0.0005;
  } else {
    safetyDepositInEth = Math.min(0.002, amountInEth * 0.01); // max cap
  }
  
  const originalSafetyDeposit = safetyDepositInEth;
  
  // ✅ NETWORK-AWARE CONTRACT MINIMUMS
  const isTestnet = networkMode === 'testnet' || DEFAULT_NETWORK_MODE === 'testnet';
  
  if (isTestnet) {
    // TESTNET: Enforce 0.01 ETH minimum (EscrowFactory.sol requirement)
    const TESTNET_MIN_SAFETY_DEPOSIT = 0.01;
    safetyDepositInEth = Math.max(safetyDepositInEth, TESTNET_MIN_SAFETY_DEPOSIT);
    
    console.log(`🛡️ TESTNET SAFETY DEPOSIT:
    📊 Amount: ${amountInEth} ETH (~$${amountInUsd.toFixed(2)})
    💡 Dynamic calculation: ${originalSafetyDeposit} ETH
    ✅ Testnet minimum applied: ${safetyDepositInEth} ETH
    📋 Testnet requires minimum: ${TESTNET_MIN_SAFETY_DEPOSIT} ETH`);
  } else {
    // MAINNET: Use pure dynamic calculation (no forced minimum)
    console.log(`🛡️ MAINNET SAFETY DEPOSIT:
    📊 Amount: ${amountInEth} ETH (~$${amountInUsd.toFixed(2)})
    💡 Dynamic calculation: ${originalSafetyDeposit} ETH
    ✅ Final amount (no forced minimum): ${safetyDepositInEth} ETH
    🎯 Mainnet uses dynamic tiers only`);
  }
  
  return ethers.parseEther(safetyDepositInEth.toString());
}

// Network Configuration
const NETWORK_CONFIG = {
  testnet: {
    ethereum: {
      chainId: 11155111, // Sepolia
      escrowFactory: '0x0ABa862Da2F004bCa6ce2990EbC0f77184B6d3a8', // NEW: Fresh EscrowFactory
      htlcBridge: '0x3f42E2F5D4C896a9CB62D0128175180a288de38A', // NEW: Fresh HTLCBridge
    },
    stellar: {
      networkPassphrase: 'Test SDF Network ; September 2015',
      horizonUrl: 'https://horizon-testnet.stellar.org',
    }
  },
  mainnet: {
    ethereum: {
      chainId: 1, // Ethereum Mainnet
      escrowFactory: '0xa7bcb4eac8964306f9e3764f67db6a7af6ddf99a', // 1inch Factory
      htlcBridge: '0x87372d4bba85acf7c2374b4719a1020e507ab73e', // MainnetHTLC (DEPLOYED!)
    },
    stellar: {
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
      horizonUrl: 'https://horizon.stellar.org',
    }
  }
};

// Determine current network from environment (default)
const DEFAULT_NETWORK_MODE = process.env.NETWORK_MODE || 'mainnet'; // Read from .env

// Dynamic network config getter
function getNetworkConfig(networkMode?: string): any {
  const selectedNetwork = networkMode || DEFAULT_NETWORK_MODE;
  return NETWORK_CONFIG[selectedNetwork] || NETWORK_CONFIG[DEFAULT_NETWORK_MODE];
}



console.log(`🌐 Default Network Mode: ${DEFAULT_NETWORK_MODE.toUpperCase()}`);
console.log(`🏭 Default Escrow Factory: ${getNetworkConfig().ethereum.escrowFactory}`);

// Real HTLC Bridge Contract ABI  
const HTLC_BRIDGE_ABI = [
  "function createOrder(address token, uint256 amount, bytes32 hashLock, uint256 timelock, uint256 feeRate, address beneficiary, address refundAddress, uint256 destinationChainId, bytes32 stellarTxHash, bool partialFillEnabled) external payable returns (uint256 orderId)"
];

// MAINNET: GERÇEK 1inch EscrowFactory ABI (verdiğin ABI'dan)
const MAINNET_ESCROW_FACTORY_ABI = [
  `function createDstEscrow(
    (bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) dstImmutables,
    uint256 srcCancellationTimestamp
  ) external payable`,
  "function addressOfEscrowSrc((bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables) external view returns (address)",
  "function addressOfEscrowDst((bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) immutables) external view returns (address)",
  "function ESCROW_SRC_IMPLEMENTATION() external view returns (address)",
  "function ESCROW_DST_IMPLEMENTATION() external view returns (address)",
  "function availableCredit(address account) external view returns (uint256)",
  "function increaseAvailableCredit(address account, uint256 amount) external returns (uint256 allowance)",
  "function decreaseAvailableCredit(address account, uint256 amount) external returns (uint256 allowance)",
  
  // Events
  "event DstEscrowCreated(address escrow, bytes32 hashlock, uint256 taker)",
  "event SrcEscrowCreated((bytes32 orderHash, bytes32 hashlock, uint256 maker, uint256 taker, uint256 token, uint256 amount, uint256 safetyDeposit, uint256 timelocks) srcImmutables, (uint256 maker, uint256 amount, uint256 token, uint256 safetyDeposit, uint256 chainId) dstImmutablesComplement)"
];

// TESTNET: Bizim custom EscrowFactory ABI (eski hali)
const TESTNET_ESCROW_FACTORY_ABI = [
  "function createEscrow((address token, uint256 amount, bytes32 hashLock, uint256 timelock, address beneficiary, address refundAddress, uint256 safetyDeposit, uint256 chainId, bytes32 stellarTxHash, bool isPartialFillEnabled) config) external payable returns (uint256 escrowId)",
  "function fundEscrow(uint256 escrowId) external",
  "function claimEscrow(uint256 escrowId, bytes32 preimage) external",
  "function refundEscrow(uint256 escrowId) external",
  "function getEscrow(uint256 escrowId) external view returns (tuple(address escrowAddress, tuple(address token, uint256 amount, bytes32 hashLock, uint256 timelock, address beneficiary, address refundAddress, uint256 safetyDeposit, uint256 chainId, bytes32 stellarTxHash, bool isPartialFillEnabled) config, uint8 status, uint256 createdAt, uint256 filledAmount, uint256 safetyDepositPaid, address resolver, bool isActive))",
  "function authorizeResolver(address resolver) external",
  "function authorizedResolvers(address resolver) external view returns (bool)",
  "function totalEscrows() external view returns (uint256)",
  "function MIN_SAFETY_DEPOSIT() external view returns (uint256)",
  "function MAX_SAFETY_DEPOSIT() external view returns (uint256)",
  // Events
  "event EscrowCreated(uint256 indexed escrowId, address indexed escrowAddress, address indexed resolver, address token, uint256 amount, bytes32 hashLock, uint256 timelock, uint256 safetyDeposit, uint256 chainId)",
  "event EscrowFunded(uint256 indexed escrowId, address indexed funder, uint256 amount, uint256 safetyDeposit)",
  "event EscrowClaimed(uint256 indexed escrowId, address indexed claimer, uint256 amount, bytes32 preimage)",
  "event EscrowRefunded(uint256 indexed escrowId, address indexed refundee, uint256 amount, uint256 safetyDeposit)"
];

// Dinamik ABI seçici
function getEscrowFactoryABI(isMainnet: boolean) {
  return isMainnet ? MAINNET_ESCROW_FACTORY_ABI : TESTNET_ESCROW_FACTORY_ABI;
}
import { ethereumListener } from './ethereum-listener.js';
import { quoterService } from './quoter-service.js';
import { ordersService } from './orders.js';
import { gasPriceTracker } from './gas-tracker.js';
import { presetManager } from './preset-manager.js';
import { validateQuoteRequest, createErrorResponse, createSuccessResponse, getErrorMessage } from './utils.js';
import { QuoteRequest, SignedOrderInput, SecretInput } from './types.js';

// Phase 4: Event System imports
import FusionEventManager, { EventType } from './event-handlers.js';
import FusionRpcHandler from './rpc-methods.js';
import EventHistoryManager from './event-history.js';
import ClientSubscriptionManager from './client-subscriptions.js';



// Phase 5: Recovery System imports
import RecoveryService, { RecoveryConfig, RecoveryType, RecoveryStatus } from './recovery-service.js';

// Stellar SDK will be imported dynamically when needed

// Phase 8: Monitoring System imports
import { getMonitor } from './monitoring.js';

// Contract addresses
const ETH_TO_XLM_RATE = 10000; // 1 ETH = 10,000 XLM (LEGACY - now using real-time prices)
// Network-aware contract addresses  
const HTLC_CONTRACT_ADDRESS = getHtlcBridgeAddress(); // Dynamic: testnet/mainnet

// Real-time price fetching function
async function getRealTimePrices(): Promise<{xlmUsdPrice: number, ethUsdPrice: number, ethToXlmRate: number}> {
  let xlmUsdPrice = 0.12; // Default fallback
  let ethUsdPrice = 3500;  // Default fallback
  
  try {
    // Try to get real-time prices from CoinGecko API
    const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar,ethereum&vs_currencies=usd');
    if (priceResponse.ok) {
      const priceData = await priceResponse.json() as any;
      xlmUsdPrice = priceData.stellar?.usd || 0.12;
      ethUsdPrice = priceData.ethereum?.usd || 3500;
      console.log('📊 Real-time prices fetched from CoinGecko:', { xlmUsdPrice, ethUsdPrice });
    } else {
      console.warn('⚠️ CoinGecko API failed, using fallback prices');
    }
  } catch (priceError) {
    console.warn('⚠️ Price fetch failed, using fallback prices:', priceError.message);
  }
  
  const ethToXlmRate = ethUsdPrice / xlmUsdPrice; // 1 ETH = ? XLM
  
  return {
    xlmUsdPrice,
    ethUsdPrice,
    ethToXlmRate
  };
}

// Dynamic contract address getters
function getEscrowFactoryAddress(networkMode?: string): string {
  return getNetworkConfig(networkMode).ethereum.escrowFactory;
}

function getHtlcBridgeAddress(networkMode?: string): string {
  return getNetworkConfig(networkMode).ethereum.htlcBridge;
}

// New function to determine which contract to use based on operation type
function shouldUseHTLCContract(networkMode?: string): boolean {
  const config = getNetworkConfig(networkMode);
  const selectedNetwork = networkMode || DEFAULT_NETWORK_MODE;
  
  // ✅ BOTH MAINNET AND TESTNET: Always use EscrowFactory
  // HTLC only for Stellar side (non-EVM) and XLM→ETH orders
  return false; // Always use EscrowFactory for ETH→XLM transactions
}

// Relayer configuration from environment variables
export const RELAYER_CONFIG = {
  // Service settings
  port: Number(process.env.RELAYER_PORT) || 3001,
      pollInterval: Number(process.env.RELAYER_POLL_INTERVAL) || 15000, // Increased from 5s to 15s
  retryAttempts: Number(process.env.RELAYER_RETRY_ATTEMPTS) || 3,
  retryDelay: Number(process.env.RELAYER_RETRY_DELAY) || 2000,
  
  // Network configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  enableMockMode: process.env.ENABLE_MOCK_MODE === 'true',
  debug: process.env.DEBUG === 'true',
  
  // Ethereum configuration
  ethereum: {
    network: process.env.ETHEREUM_NETWORK || 'mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_MAINNET_API_KEY_HERE',
    // ✅ Dynamic contract addresses based on network
    contractAddress: getHtlcBridgeAddress(DEFAULT_NETWORK_MODE), // For EthereumEventListener (testnet only)
    escrowFactoryAddress: getEscrowFactoryAddress(DEFAULT_NETWORK_MODE), // For transactions (mainnet + testnet)
    fusionApiUrl: 'https://api.1inch.dev/fusion',
    fusionApiKey: process.env.ONEINCH_API_KEY || '',
    privateKey: process.env.RELAYER_PRIVATE_KEY || '',
    gasPrice: Number(process.env.GAS_PRICE_GWEI) || 20,
    gasLimit: Number(process.env.GAS_LIMIT) || 300000,
    startBlock: Number(process.env.START_BLOCK_ETHEREUM) || 0,
    minConfirmations: Number(process.env.MIN_CONFIRMATION_BLOCKS) || 6,
  },
  
  // Stellar configuration - DYNAMIC based on DEFAULT_NETWORK_MODE
  stellar: {
    network: process.env.STELLAR_NETWORK || DEFAULT_NETWORK_MODE, // ✅ DEFAULT_NETWORK_MODE kullan!
    horizonUrl: process.env.STELLAR_HORIZON_URL || (
      (DEFAULT_NETWORK_MODE === 'mainnet') 
        ? 'https://horizon.stellar.org' 
        : 'https://horizon-testnet.stellar.org'
    ),
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || (
      (DEFAULT_NETWORK_MODE === 'mainnet')
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015'
    ),
    secretKey: process.env.RELAYER_STELLAR_SECRET || '',
    publicKey: process.env.RELAYER_STELLAR_PUBLIC || '',
    startLedger: Number(process.env.START_LEDGER_STELLAR) || 0,
    minConfirmations: Number(process.env.STELLAR_MIN_CONFIRMATIONS) || 1,
  },
  
  // Fee and limit settings
  fees: {
    feeRate: Number(process.env.RELAYER_FEE_RATE) || 50, // basis points
    minSwapAmountUSD: Number(process.env.MIN_SWAP_AMOUNT_USD) || 10,
    maxSwapAmountUSD: Number(process.env.MAX_SWAP_AMOUNT_USD) || 100000,
    maxOrderAmount: Number(process.env.MAX_ORDER_AMOUNT) || 1000000,
  },
  
  // Security settings
  security: {
    minTimelockDuration: Number(process.env.MIN_TIMELOCK_DURATION) || 3600,
    maxTimelockDuration: Number(process.env.MAX_TIMELOCK_DURATION) || 604800,
    defaultTimelockDuration: Number(process.env.DEFAULT_TIMELOCK_DURATION) || 86400,
    emergencyShutdown: process.env.EMERGENCY_SHUTDOWN === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  },
  
  // Monitoring and logging
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    healthCheckInterval: Number(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    healthCheckTimeout: Number(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  }
};

// Validate required environment variables
function validateConfig() {
  const requiredVars = [
    'ETHEREUM_RPC_URL',
    'STELLAR_HORIZON_URL',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName] || process.env[varName]?.includes('YOUR_'));
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing or placeholder environment variables:');
    missingVars.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('   Please copy env.template to .env and configure properly');
  }
  
  // Check for placeholder private keys
  if (process.env.RELAYER_PRIVATE_KEY?.startsWith('0x000000')) {
    console.warn('⚠️  Using placeholder private key - generate a real key for production');
  }
  
  if (process.env.RELAYER_STELLAR_SECRET?.includes('SAMPLE')) {
    console.warn('⚠️  Using placeholder Stellar secret - generate real keys for production');
  }
}

// Initialize relayer service
async function initializeRelayer() {
  console.log('🔄 Initializing FusionBridge Relayer Service');
  console.log('============================================');
  
  // Configure Express middleware with enhanced CORS
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Validate configuration
  validateConfig();
  
  // Display configuration
  console.log(`🌐 Environment: ${RELAYER_CONFIG.nodeEnv}`);
  console.log(`🔗 Ethereum Network: ${RELAYER_CONFIG.ethereum.network}`);
  console.log(`⭐ Stellar Network: ${RELAYER_CONFIG.stellar.network}`);
  console.log(`🏃 Mock Mode: ${RELAYER_CONFIG.enableMockMode ? 'Enabled' : 'Disabled'}`);
  console.log(`📊 Port: ${RELAYER_CONFIG.port}`);
  console.log(`⏱️  Poll Interval: ${RELAYER_CONFIG.pollInterval}ms`);
  
  if (RELAYER_CONFIG.security.emergencyShutdown) {
    console.error('🚨 Emergency shutdown is active - service will not start');
    process.exit(1);
  }
  
  if (RELAYER_CONFIG.security.maintenanceMode) {
    console.warn('🔧 Maintenance mode is active');
  }
  
  // Start gas price tracking
  try {
    gasPriceTracker.startMonitoring(30000); // Monitor every 30 seconds
    console.log('⛽ Gas price tracking started');
  } catch (error) {
    console.error('❌ Failed to start gas price tracking:', error);
  }

  // Start monitoring system
  try {
    const monitor = getMonitor();
    monitor.registerService('ethereum', async () => ({ status: 'healthy' }));
    monitor.registerService('stellar', async () => ({ status: 'healthy' }));
    monitor.registerService('gas-tracker', async () => ({ status: 'healthy' }));
    monitor.registerService('orders', async () => ({ status: 'healthy' }));
    monitor.startMonitoring(30000); // Monitor every 30 seconds
    console.log('📊 Uptime monitoring started');
  } catch (error) {
    console.error('❌ Failed to start monitoring system:', error);
  }

  // Start Ethereum event listener (TESTNET ONLY)  
  try {
    if (DEFAULT_NETWORK_MODE === 'mainnet') {
      console.log('🏗️ Mainnet mode: Skipping EthereumEventListener (using 1inch EscrowFactory)');
    } else {
      console.log('🔄 Testnet mode: Starting EthereumEventListener for HTLCBridge monitoring');
      await ethereumListener.startListening();
    }
  } catch (error) {
    console.error('❌ Failed to start Ethereum listener:', error);
    // Don't exit on mainnet, only on testnet
    if (DEFAULT_NETWORK_MODE !== 'mainnet') {
      process.exit(1);
    }
  }
  
  // ===== ORDERS API ENDPOINTS =====
  
  // ✅ Network-aware contract logging
  console.log(`🌐 Network Mode: ${DEFAULT_NETWORK_MODE.toUpperCase()}`);
  if (DEFAULT_NETWORK_MODE === 'mainnet') {
    console.log('🏭 MAINNET Escrow Factory:', getEscrowFactoryAddress('mainnet'));
    console.log('🎯 MAINNET HTLC (XLM→ETH only):', getHtlcBridgeAddress('mainnet'));
  } else {
    console.log('🧪 TESTNET HTLC Bridge (Event Listener):', getHtlcBridgeAddress('testnet'));
    console.log('🧪 TESTNET Escrow Factory:', getEscrowFactoryAddress('testnet'));
  }
    
  // Global order storage (in production this would be a database)
const activeOrders = new Map();

  // DEBUG: Simple transaction test
  app.get('/api/test-transaction', (req, res) => {
    res.json({
      success: true,
      approvalTransaction: {
        to: '0x742d35cF0b7bbF6E175239d74a0e0a3d1C7B87E4',  // Simple relayer address
        value: '0x71afd498d0000',  // 0.001 ETH
        data: '0x',
        gas: '0x5208',  // Standard ETH transfer gas
        gasPrice: '0x4a817c800'
      },
      message: 'DEBUG: Simple transaction format'
    });
  });

  // POST /api/orders/create - Create bridge order (Frontend Integration)
  console.log("📍 DEBUG: About to register orders endpoint");
  
  // Root route first
  app.get('/', (req, res) => {
    res.json({ message: 'FusionBridge Relayer API', status: 'running' });
  });
  
  // Simple test endpoints
  app.get('/test', (req, res) => {
    res.json({ message: 'ROOT test working!', timestamp: new Date().toISOString() });
  });
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API endpoints are working!', timestamp: new Date().toISOString() });
  });



  console.log('📍 DEBUG: Test endpoints registered (root + api)');
  console.log('📍 DEBUG: Now registering transaction history endpoint...');

  // POST /api/transactions/history - RIGHT NEXT TO WORKING ENDPOINT
  app.post('/api/transactions/history', async (req, res) => {
    console.log('🎯 TRANSACTION HISTORY ENDPOINT HIT - NEXT TO ORDERS!');
    try {
      const { ethAddress, stellarAddress } = req.body;
      
      console.log('📊 Fetching transaction history for:', { ethAddress, stellarAddress });
      
      // Get all orders from activeOrders Map  
      const allOrders = Array.from(activeOrders.values());
      console.log('📊 Total orders in activeOrders:', allOrders.length);
      
      // Filter orders by user addresses and format for history
      const userTransactions = allOrders
        .filter(order => 
          (ethAddress && order.ethAddress === ethAddress) ||
          (stellarAddress && order.stellarAddress === stellarAddress)
        )
        .map(order => ({
          id: order.orderId,
          txHash: order.ethTxHash || order.stellarTxHash || order.orderId,
          fromNetwork: order.direction === 'eth-to-xlm' ? 
            (DEFAULT_NETWORK_MODE === 'mainnet' ? 'ETH Mainnet' : 'ETH Sepolia') : 
            (DEFAULT_NETWORK_MODE === 'mainnet' ? 'Stellar Mainnet' : 'Stellar Testnet'),
          toNetwork: order.direction === 'eth-to-xlm' ? 
            (DEFAULT_NETWORK_MODE === 'mainnet' ? 'Stellar Mainnet' : 'Stellar Testnet') : 
            (DEFAULT_NETWORK_MODE === 'mainnet' ? 'ETH Mainnet' : 'ETH Sepolia'),
          fromToken: order.direction === 'eth-to-xlm' ? 'ETH' : 'XLM',
          toToken: order.direction === 'eth-to-xlm' ? 'XLM' : 'ETH',
          amount: order.amount || '0',
          estimatedAmount: order.targetAmount ? 
            (parseFloat(order.targetAmount) / 1e18).toFixed(6) : '0',
          status: order.status === 'completed' ? 'completed' : 
                 order.status === 'failed' ? 'failed' :
                 order.status === 'cancelled' ? 'cancelled' : 'pending',
          timestamp: order.timestamp || Date.now(),
          ethTxHash: order.ethTxHash,
          stellarTxHash: order.stellarTxHash,
          direction: order.direction
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`📊 Found ${userTransactions.length} matching transactions for user`);
      
      res.json({
        success: true,
        transactions: userTransactions,
        count: userTransactions.length
      });
      
    } catch (error: any) {
      console.error('❌ Transaction history fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch transaction history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  app.post('/api/orders/create', async (req, res) => {
    try {
      console.log('🔍 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
      
      const { fromChain, toChain, fromToken, toToken, amount, ethAddress, stellarAddress, direction, exchangeRate, network, networkMode } = req.body;
      
      console.log('🎯 EXTRACTED VALUES:', {
        amount: amount,
        amountType: typeof amount,
        amountLength: amount ? amount.length : 'undefined',
        amountString: String(amount)
      });
      
      // Validate required fields
      if (!fromChain || !toChain || !fromToken || !toToken || !amount || !ethAddress || !stellarAddress) {
        console.log('❌ VALIDATION FAILED:', {
          fromChain: !!fromChain,
          toChain: !!toChain, 
          fromToken: !!fromToken,
          toToken: !!toToken,
          amount: !!amount,
          ethAddress: !!ethAddress,
          stellarAddress: !!stellarAddress
        });
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['fromChain', 'toChain', 'fromToken', 'toToken', 'amount', 'ethAddress', 'stellarAddress']
        });
      }

      console.log('🌉 Creating bridge order:', {
        direction,
        fromChain,
        toChain,
        fromToken,
        toToken,
        amount,
        exchangeRate: exchangeRate || ETH_TO_XLM_RATE,
        ethAddress,
        stellarAddress
      });

      // Normalize addresses to avoid checksum issues
      const normalizedEthAddress = ethAddress.toLowerCase();

      // Generate order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Dynamic network detection from request or fallback to env
      const requestNetwork = networkMode || network || (req.query.network) || DEFAULT_NETWORK_MODE;
      const isMainnetRequest = requestNetwork === 'mainnet';
      
      console.log(`🌐 Network Detection:`, {
        requestNetwork,
        queryParam: req.query.network,
        bodyNetworkMode: networkMode,
        bodyNetwork: network,
        envDefault: DEFAULT_NETWORK_MODE,
        finalDecision: isMainnetRequest ? 'MAINNET' : 'TESTNET'
      });
      
      // FORCE DEBUG: Always log this
      console.log(`🔍 CRITICAL DEBUG:`, {
        'networkMode': networkMode,
        'network': network,
        'req.query.network': req.query.network,
        'DEFAULT_NETWORK_MODE': DEFAULT_NETWORK_MODE,
        'requestNetwork': requestNetwork,
        'isMainnetRequest': isMainnetRequest,
        'WILL_GO_TO': isMainnetRequest ? 'MAINNET_BRANCH' : 'TESTNET_BRANCH'
      });
      
      // For ETH to XLM direction
      if (direction === 'eth_to_xlm') {
        
        if (isMainnetRequest) {
          // MAINNET: Use DUAL CONTRACT APPROACH (1inch EscrowFactory + MainnetHTLC)
          const useHTLC = shouldUseHTLCContract('mainnet');
          console.log(`🏭 MAINNET: Using ${useHTLC ? 'HTLC + EscrowFactory' : 'EscrowFactory only'} approach...`);

          // MOCK MODE for ETH→XLM
          if (RELAYER_CONFIG.enableMockMode) {
            console.log('🧪 MOCK MODE: Simulating ETH→XLM mainnet escrow creation...');
            
            const userAmountWei = ethers.parseEther(amount);
            const secret = ethers.hexlify(ethers.randomBytes(32));
            const hashLock = ethers.keccak256(secret);
            
            const orderData = {
              orderId,
              direction: 'eth_to_xlm',
              amount: userAmountWei.toString(),
              ethAddress: normalizedEthAddress,
              stellarAddress,
              exchangeRate: exchangeRate || ETH_TO_XLM_RATE,
              secret,
              hashLock,
              created: new Date().toISOString(),
              status: 'mock_escrow_created',
              contractType: 'MOCK_1INCH_ESCROW_FACTORY'
            };
            
            activeOrders.set(orderId, orderData);
            
            return res.json({
              success: true,
              orderId,
              orderData,
              message: '🧪 MOCK: ETH→XLM escrow created',
              nextStep: 'Mock: User MetaMask transaction',
              instructions: [
                '🧪 MOCK MODE: No real transactions',
                '1. Mock 1inch EscrowFactory createDstEscrow called',
                '2. Mock safety deposit and escrow creation',
                '3. Mock Stellar HTLC creation for XLM delivery'
              ],
              ethereum: {
                contractAddress: getEscrowFactoryAddress('mainnet'),
                method: 'createDstEscrow',
                amount: amount + ' ETH',
                hashLock
              },
              stellar: {
                htlcId: `mock-stellar-htlc-${Date.now()}`,
                amount: (parseFloat(amount) * ETH_TO_XLM_RATE).toFixed(7) + ' XLM', // Mock mode uses legacy rate
                hashLock
              }
            });
          }
          
          // Get REAL-TIME exchange rates from market for ETH→XLM
        const realTimePrices = await getRealTimePrices();
        const { xlmUsdPrice, ethUsdPrice, ethToXlmRate } = realTimePrices;

        // amount is already a string like "0.00012", convert to wei
        const userAmountWei = ethers.parseEther(amount);
        console.log(`💰 User Amount: ${amount} ETH = ${userAmountWei.toString()} wei`);
        
        // Calculate real XLM amount from ETH using market prices
        const ethAmount = parseFloat(amount);
        const realMarketXlmAmount = (ethAmount * ethUsdPrice) / xlmUsdPrice;
        
        console.log('💱 REAL MARKET ETH→XLM Exchange:', {
          ethAmount,
          ethUsdPrice: `$${ethUsdPrice}`,
          xlmUsdPrice: `$${xlmUsdPrice}`,
          realMarketRate: `1 ETH = ${realMarketXlmAmount.toFixed(2)} XLM`,
          ethTotalValue: `$${(ethAmount * ethUsdPrice).toFixed(4)}`,
          xlmAmount: `${realMarketXlmAmount.toFixed(7)} XLM`,
          xlmTotalValue: `$${(realMarketXlmAmount * xlmUsdPrice).toFixed(4)}`
        });
        
        // Generate HTLC parameters for cross-chain bridge
        const secretBytes = new Uint8Array(32);
        crypto.getRandomValues(secretBytes);
        const secret = `0x${Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        const hashLock = ethers.keccak256(secret);
        
        console.log('🔑 Generated HTLC parameters:', {
          secret: secret.substring(0, 10) + '...',
          hashLock: hashLock
        });
        
        // Calculate dynamic safety deposit with network awareness
        const actualSafetyDeposit = calculateDynamicSafetyDeposit(userAmountWei, requestNetwork);
        
        const amountInEth = parseFloat(ethers.formatEther(userAmountWei));
        const amountInUsd = amountInEth * ethUsdPrice; // Use real ETH price
          const safetyDepositInEth = parseFloat(ethers.formatEther(actualSafetyDeposit));
          
          console.log(`💰 Dynamic Safety Deposit:
          📊 Amount: ${amountInEth} ETH (~$${amountInUsd.toFixed(2)})
          🛡️ Safety Deposit: ${safetyDepositInEth} ETH (~$${(safetyDepositInEth * 3500).toFixed(2)})`);
          
          console.log('💰 Safety deposit:', ethers.formatEther(actualSafetyDeposit), 'ETH');
          
          // Generate order hash for 1inch protocol
          const orderHash = ethers.keccak256(
            ethers.solidityPacked(
              ['address', 'uint256', 'bytes32', 'uint256'],
              [normalizedEthAddress, userAmountWei, hashLock, Math.floor(Date.now() / 1000)]
            )
          );
          
          // Store order with HTLC details 
          const orderData = {
            orderId,
            orderHash,
            hashLock: hashLock,
            secret: secret,
            ethAddress: normalizedEthAddress,
            stellarAddress,
            amount: userAmountWei.toString(),
            safetyDeposit: actualSafetyDeposit.toString(),
            exchangeRate: ethToXlmRate, // Use real-time rate
            contractType: 'ONEINCH_ESCROW_FACTORY_MAINNET_DST',
            status: 'pending_dst_escrow_deployment',
            network: 'ethereum',
            chainId: 1,
            created: new Date().toISOString()
          };
          
          // ✅ Add networkMode for XLM→ETH processing
          activeOrders.set(orderId, {
            ...orderData,
            networkMode: requestNetwork
          });
          
          const totalCost = userAmountWei + actualSafetyDeposit;
          
          // Create IBaseEscrow.Immutables struct for createDstEscrow
          const dstImmutables = {
            orderHash: orderHash,
            hashlock: hashLock,
            maker: normalizedEthAddress, // Will be converted to uint256 by ethers
            taker: '0x0000000000000000000000000000000000000000', // Zero address as uint256
            token: '0x0000000000000000000000000000000000000000', // ETH as uint256
            amount: userAmountWei.toString(),
            safetyDeposit: actualSafetyDeposit.toString(),
            timelocks: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
          };
          
          const srcCancellationTimestamp = Math.floor(Date.now() / 1000) + (4 * 60 * 60); // 4 hours
          
          // Encode EscrowFactory createDstEscrow call (DOĞRU MAINNET ABI!)
          console.log('🔍 DEBUG: About to encode createDstEscrow with:', {
            dstImmutables,
            srcCancellationTimestamp,
            abiLength: getEscrowFactoryABI(true).length
          });
          
          const escrowInterface = new ethers.Interface(getEscrowFactoryABI(true)); // true = mainnet
          console.log('🔍 DEBUG: Interface created, available functions:', escrowInterface.fragments.map(f => f.type === 'function' ? (f as any).name : f.type));
          
          const encodedData = escrowInterface.encodeFunctionData("createDstEscrow", [
            dstImmutables,
            srcCancellationTimestamp
          ]);
          
          console.log('🔍 DEBUG: Encoded data length:', encodedData.length);

          // Return direct EscrowFactory contract interaction
          res.json({
            success: true,
            orderId,
            orderData,
            dstImmutables,
            srcCancellationTimestamp,
            approvalTransaction: {
              to: useHTLC ? getHtlcBridgeAddress('mainnet') : getEscrowFactoryAddress('mainnet'),       // Dynamic contract selection
              value: `0x${totalCost.toString(16)}`,  // Order amount + safety deposit
              data: encodedData,                // Contract call data
              gas: '0x30D40'                    // 200000 gas limit for contract call (reduced from 500k)
            },
            message: `🏭 Mainnet: ${useHTLC ? 'HTLC + EscrowFactory' : 'EscrowFactory only'}`,
            nextStep: useHTLC ? 'HTLC Contract çağırın' : '1inch EscrowFactory çağırın',
            instructions: useHTLC ? [
              '1. User MetaMask ile MainnetHTLC contract\'ını çağıracak',
              '2. HTLC atomic swap başlayacak',
              '3. Cross-chain bridge tamamlanacak'
            ] : [
              '1. User MetaMask ile 1inch EscrowFactory çağıracak',
              '2. Escrow yaratılacak ve safety deposit ödenecek',
              '3. Cross-chain transfer başlayacak'
            ],
            safetyDeposit: ethers.formatEther(actualSafetyDeposit.toString()),
            totalCost: ethers.formatEther(totalCost.toString()),
            contractType: 'ONEINCH_ESCROW_FACTORY_MAINNET',
            contractAddress: useHTLC ? getHtlcBridgeAddress('mainnet') : getEscrowFactoryAddress('mainnet'),
            note: '✅ 1inch EscrowFactory createDstEscrow - Resmi cross-chain pattern!'
          });
          return;
        }
        
        // TESTNET: Use ESKİ custom EscrowFactory createEscrow (bizim testnet contract'ımız)
        
        // Generate HTLC parameters
        const secretBytes = new Uint8Array(32);
        crypto.getRandomValues(secretBytes);
        const secret = `0x${Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        const hashLock = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        
        const orderData = {
          orderId,
          token: '0x0000000000000000000000000000000000000000', // ETH
          amount: (parseFloat(amount) * 1e18).toString(),
          hashLock,
          timelock: Math.floor(Date.now() / 1000) + 7201, // 2+ hours
          feeRate: 100, // 1%
          beneficiary: stellarAddress,
          refundAddress: normalizedEthAddress,
          destinationChainId: 1, // Stellar
          stellarTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          partialFillEnabled: false,
          secret: secret,
          created: new Date().toISOString(),
          status: 'pending_direct_escrow'
        };

        // Store order
        activeOrders.set(orderId, {
          ...orderData,
          ethAddress: normalizedEthAddress,
          stellarAddress,
          amount: orderData.amount,  // ✅ Use wei format, not decimal string
          exchangeRate: exchangeRate || ETH_TO_XLM_RATE,
          networkMode: requestNetwork  // ✅ Store network for XLM→ETH processing
        });

        console.log('✅ TESTNET ETH→XLM Order created:', orderId);
        console.log('🏭 TESTNET ESKİ ESCROW MODE: User → createEscrow (bizim custom contract)');
        
        // Calculate dynamic safety deposit based on USD value with network awareness
        const orderAmountBigInt = BigInt(orderData.amount);
        const actualSafetyDeposit = calculateDynamicSafetyDeposit(orderData.amount, requestNetwork);
        // ✅ CORRECT: msg.value = user amount + safety deposit (user's ETH gets locked + safety deposit)
        const totalCost = orderAmountBigInt + actualSafetyDeposit;
        
        // Create EscrowConfig struct (ESKİ testnet yapısı)
        const escrowConfig = {
          token: '0x0000000000000000000000000000000000000000', // ETH
          amount: orderData.amount,
          hashLock: orderData.hashLock,
          timelock: orderData.timelock,
          beneficiary: normalizedEthAddress,
          refundAddress: normalizedEthAddress,
          safetyDeposit: actualSafetyDeposit.toString(),
          chainId: 11155111, // Sepolia testnet
          stellarTxHash: ethers.ZeroHash,
          isPartialFillEnabled: orderData.partialFillEnabled || false
        };
        
        // Encode EscrowFactory createEscrow call (ESKİ testnet ABI!)
        const escrowInterface = new ethers.Interface(getEscrowFactoryABI(false)); // false = testnet
        const encodedData = escrowInterface.encodeFunctionData("createEscrow", [escrowConfig]);

        // Return direct EscrowFactory contract interaction
        res.json({
          success: true,
          orderId,
          orderData,
          escrowConfig,
          approvalTransaction: {
            to: getEscrowFactoryAddress(requestNetwork),       // Dynamic EscrowFactory (testnet)
            value: `0x${totalCost.toString(16)}`,  // Order amount + safety deposit
            data: encodedData,                // createEscrow call with config
            gas: '0x2DC6C0'                   // 3000000 gas limit for large contract deployment (HTLCBridge ~639 lines)
          },
          message: '🏭 TESTNET: ESKİ custom EscrowFactory createEscrow',
          nextStep: 'EscrowFactory createEscrow çağırın',
          instructions: [
            '1. User MetaMask ile bizim custom EscrowFactory contract\'ını çağıracak',
            '2. createEscrow fonksiyonu çalışacak (ESKİ testnet ABI ile!)',
            '3. Cross-chain bridge için escrow oluşacak'
          ],
          safetyDeposit: ethers.formatEther(actualSafetyDeposit.toString()),
          totalCost: ethers.formatEther(totalCost.toString()),
          contractType: 'ESCROW_FACTORY_DIRECT_TESTNET',
          contractAddress: getEscrowFactoryAddress(requestNetwork),
          note: '✅ TESTNET: ESKİ createEscrow metodu - bizim custom contract!'
        });
        
      } else if (direction === 'xlm_to_eth') {
        // XLM→ETH: Create HTLC on both Stellar and Ethereum (MainnetHTLC)

        console.log('🌟 XLM→ETH: Creating dual HTLC setup...');
        
        // Get REAL-TIME exchange rates from market
        const realTimePrices = await getRealTimePrices();
        const { xlmUsdPrice, ethUsdPrice, ethToXlmRate } = realTimePrices;
        
        const xlmAmount = parseFloat(amount);
        
        // Calculate REAL market rate: XLM USD value / ETH USD value
        const realMarketRate = xlmUsdPrice / ethUsdPrice;
        const ethAmount = xlmAmount * realMarketRate;
        
        console.log('💱 REAL MARKET XLM→ETH Exchange:', {
          xlmAmount,
          xlmUsdPrice: `$${xlmUsdPrice}`,
          ethUsdPrice: `$${ethUsdPrice}`,
          realMarketRate: `1 XLM = ${realMarketRate.toFixed(8)} ETH`,
          xlmTotalValue: `$${(xlmAmount * xlmUsdPrice).toFixed(4)}`,
          ethAmount: `${ethAmount.toFixed(8)} ETH`,
          ethTotalValue: `$${(ethAmount * ethUsdPrice).toFixed(4)}`
        });
        
        // Generate HTLC parameters
        const secret = ethers.hexlify(ethers.randomBytes(32));
        const hashLock = ethers.keccak256(secret).substring(2); // Remove 0x prefix for Stellar
        
        console.log('🔑 Generated HTLC parameters for XLM→ETH:', {
          secret: secret.substring(0, 12) + '...',
          hashLock
        });

        if (RELAYER_CONFIG.enableMockMode) {
          console.log('🧪 MOCK MODE: Simulating XLM→ETH HTLC creation...');
          
          const orderData = {
            orderId,
            direction: 'xlm_to_eth',
            stellarAmount: (xlmAmount * 1e7).toString(),
            ethAmount: (ethAmount * 1e18).toString(),
            ethAddress,
            stellarAddress,
            exchangeRate: ethToXlmRate,
            secret,
            hashLock,
            created: new Date().toISOString(),
            status: 'mock_htlc_created',
            contractType: 'MOCK_DUAL_HTLC'
          };
          
          activeOrders.set(orderId, orderData);
          
          return res.json({
            success: true,
            orderId,
            orderData,
            message: '🧪 MOCK: XLM→ETH HTLCs created',
            nextStep: 'Mock: User deposits XLM to Stellar HTLC',
            instructions: [
              '🧪 MOCK MODE: No real transactions',
              '1. Mock Stellar HTLC created for XLM lock',
              '2. Mock MainnetHTLC created for ETH unlock',
              '3. User would deposit XLM and trigger ETH release'
            ],
            stellar: {
              htlcId: `mock-stellar-htlc-${Date.now()}`,
              amount: xlmAmount.toString() + ' XLM',
              hashLock: hashLock // Already without 0x for Stellar
            },
            ethereum: {
              contractAddress: getHtlcBridgeAddress('mainnet'),
              ethAmount: ethAmount.toFixed(6) + ' ETH',
              hashLock: '0x' + hashLock // With 0x for Ethereum display
            }
          });
        }

        // FIXED: Create pending order ONLY - NO ETH HTLC YET!
        console.log('🌟 XLM→ETH: Creating pending order (awaiting XLM payment)...');
        console.log('📝 User will send XLM first, then relayer will create ETH HTLC');

        // Safe ETH amount conversion with decimal limit
        const safeEthAmount = Math.min(Math.max(ethAmount, 0.000001), 10.0); // Min 0.000001, Max 10 ETH
        const roundedEthAmount = Math.round(safeEthAmount * 1e6) / 1e6; // 6 decimal places
        
        let ethAmountWei;
        try {
          ethAmountWei = ethers.parseEther(roundedEthAmount.toString());
        } catch (parseError: any) {
          console.warn('⚠️ parseEther failed in create endpoint, using minimum amount:', parseError.message);
          ethAmountWei = ethers.parseEther("0.001"); // 0.001 ETH minimum
        }
        
        console.log('🔢 XLM→ETH PENDING - ETH amount will be:', roundedEthAmount, 'ETH');

        // Store pending order data (NO ETH HTLC YET!)
        const relayerStellarAddress = process.env.RELAYER_STELLAR_PUBLIC || 'YOUR_STELLAR_PUBLIC_KEY_HERE';
        
        const orderData = {
          orderId,
          direction: 'xlm_to_eth',
          stellarAmount: (xlmAmount * 1e7).toString(),
          ethAmount: ethAmountWei.toString(),
          ethAddress,
          stellarAddress,
          exchangeRate: ethToXlmRate,
          secret,
          hashLock,
          created: new Date().toISOString(),
          status: 'awaiting_xlm_payment', // PENDING STATUS
          contractType: 'XLM_TO_ETH_PENDING',
          stellar: {
            paymentAddress: relayerStellarAddress,
            amount: xlmAmount.toString(),
            memo: `XLM-ETH-${orderId.substring(0, 8)}`
          },
          ethereum: {
            pendingAmount: ethAmountWei.toString(),
            beneficiary: ethAddress
          }
        };
        
        activeOrders.set(orderId, orderData);

        res.json({
          success: true,
          orderId,
          message: '⏳ XLM→ETH: Order created - Please send XLM to complete swap',
          orderData: {
            stellarAmount: (xlmAmount * 1e7).toString(),
            stellarAddress: relayerStellarAddress,
            memo: `XLM-ETH-${orderId.substring(0, 8)}`,
            expectedEthAmount: ethAmountWei.toString(),
            status: 'awaiting_xlm_payment',
            instructions: `Send ${xlmAmount} XLM to ${relayerStellarAddress} with memo: XLM-ETH-${orderId.substring(0, 8)}`
          }
        });
        
      } else {
        throw new Error('Invalid direction specified');
      }

    } catch (error) {
      console.error('❌ Bridge order creation failed:', error);
      res.status(500).json({
        error: 'Bridge order creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/orders/process - Process approved order (ETH→XLM: Send XLM, XLM→ETH: Send ETH)
  app.post('/api/orders/process', async (req, res) => {
    try {
      const { orderId, txHash, stellarTxHash, stellarAddress, ethAddress } = req.body;
      
      if (!orderId) {
        return res.status(400).json({
          error: 'Order ID is required'
        });
      }

      console.log('🌟 Processing approved order:', { orderId, txHash, stellarTxHash });
      
      // Get stored order
      const storedOrder = activeOrders.get(orderId);
      if (!storedOrder) {
        return res.status(404).json({
          error: 'Order not found',
          orderId
        });
      }

      // Use stored addresses
      const userStellarAddress = storedOrder.stellarAddress || stellarAddress;
      const userEthAddress = storedOrder.ethAddress || ethAddress;
      const orderAmount = storedOrder.amount;

      console.log('📋 Processing order with stored data:', {
        userStellarAddress,
        userEthAddress, 
        orderAmount,
        contractType: storedOrder.contractType
      });

      // Handle 1inch Escrow Factory orders first
      if (storedOrder.contractType === 'ONEINCH_ESCROW_FACTORY' && storedOrder.status === 'pending_escrow_deployment') {
        console.log('🏭 Processing 1inch Escrow Factory deployment...');
        
        try {
          // Escrow was deployed when user called createDstEscrow
          // Now we need to create corresponding escrow on Stellar
          console.log('🌟 Creating corresponding escrow on Stellar...');
          
          // Update order status to indicate escrow deployment success
          storedOrder.status = 'escrow_deployed';
          storedOrder.ethTxHash = txHash;
          
          // Process cross-chain transfer to Stellar
          await processEscrowToStellar(orderId, storedOrder);
          
          return res.json({
            success: true,
            orderId,
            message: '🏭 Escrow deployed and Stellar transfer initiated',
            status: 'processing_stellar_transfer'
          });
          
        } catch (escrowError: any) {
          console.error('❌ Escrow processing failed:', escrowError);
          storedOrder.status = 'escrow_failed';
          
          return res.status(500).json({
            error: 'Escrow processing failed',
            details: escrowError.message
          });
        }
      }

      console.log('🚨 DEBUG: About to determine direction...', { stellarTxHash, txHash });

      // Determine direction based on incoming data
      const isXlmToEth = stellarTxHash && !txHash; // XLM→ETH: Has stellarTxHash but no txHash
      const isEthToXlm = txHash && !stellarTxHash; // ETH→XLM: Has txHash but no stellarTxHash

      console.log('🚨 DEBUG: Direction variables computed:', { isXlmToEth, isEthToXlm });

      console.log('🔄 Direction detected:', {
        isXlmToEth,
        isEthToXlm,
        stellarTxHash: stellarTxHash || 'none',
        ethTxHash: txHash || 'none'
      });

      // XLM→ETH: Send ETH to user
      if (isXlmToEth) {
        console.log('💰 XLM→ETH: Sending ETH to user...');
        
        try {
          // ✅ NETWORK-AWARE: Detect if this order was created for testnet
          const orderNetworkMode = storedOrder.networkMode || 'mainnet'; // Check stored network
          const rpcUrl = orderNetworkMode === 'testnet' 
            ? (process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_SEPOLIA_API_KEY_HERE')
            : (process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_MAINNET_API_KEY_HERE');
          const privateKey = process.env.RELAYER_PRIVATE_KEY;
          
          console.log(`🌐 XLM→ETH Network Detection: ${orderNetworkMode.toUpperCase()}`);
          
          if (!privateKey) {
            throw new Error('RELAYER_PRIVATE_KEY environment variable is required');
          }
          
          console.log('💰 REAL MODE: Sending actual ETH transaction (process endpoint)');
          console.log('🔗 RPC URL:', rpcUrl);
          console.log('🔑 Using real private key:', privateKey.substring(0, 10) + '...');
          
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const relayerWallet = new ethers.Wallet(privateKey, provider);
          
          console.log('🔑 Relayer ETH address:', relayerWallet.address);
          
          // Get relayer balance with retry logic for Alchemy rate limiting
          console.log('🔍 Getting relayer balance...');
          let balance;
          let balanceRetryCount = 0;
          const maxBalanceRetries = 5;
          
          while (balanceRetryCount <= maxBalanceRetries) {
            try {
              balance = await provider.getBalance(relayerWallet.address);
              console.log('💰 Relayer ETH balance:', ethers.formatEther(balance), 'ETH');
              break; // Success, exit retry loop
            } catch (error: any) {
              balanceRetryCount++;
              
              // Check if it's Alchemy rate limiting (code 429)
              if (error?.code === 429 || error?.message?.includes('exceeded') || error?.message?.includes('rate limit')) {
                const delayMs = Math.pow(2, balanceRetryCount) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s, 32s
                console.log(`⏳ Alchemy rate limit hit (process endpoint, attempt ${balanceRetryCount}/${maxBalanceRetries}). Waiting ${delayMs}ms...`);
                
                if (balanceRetryCount <= maxBalanceRetries) {
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                  continue;
                }
              }
              
              // If it's not rate limiting or we've exhausted retries, throw
              console.error('❌ Failed to get relayer balance (process endpoint):', error.message);
              throw error;
            }
          }
          
                  // Calculate ETH amount to send using real-time rate from frontend
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE; // Use real rate if available
        let ethAmount;
        if (storedOrder?.targetAmount) {
          console.log('🔍 DEBUG - Raw targetAmount:', storedOrder.targetAmount);
          
          // MORE AGGRESSIVE CLEANING - handle very large numbers
          let cleanTargetAmount = storedOrder.targetAmount.toString().replace(/[^0-9.]/g, '');
          let targetAmountNum = parseFloat(cleanTargetAmount);
          
          console.log('🔍 DEBUG - Parsed targetAmount:', targetAmountNum);
          
          if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
            console.log('⚠️ Invalid targetAmount, using fallback calculation');
            // Fallback: use amount and exchange rate
            // Convert wei to ETH first, then calculate target amount
        const ethAmountFromWei = parseFloat(ethers.formatEther(orderAmount || '100000000000000000')); // 0.1 ETH default
        targetAmountNum = ethAmountFromWei / exchangeRate;
          }
          
          // EXTREME SAFETY: Max 1 ETH, min 0.000001 ETH
          const safeTargetAmount = Math.min(Math.max(targetAmountNum, 0.000001), 1.0);
          
          // Round to 6 decimal places to avoid precision issues
          const roundedTargetAmount = Math.round(safeTargetAmount * 1e6) / 1e6;
          
          console.log('🔢 SAFE CONVERSION - targetAmount:', targetAmountNum, '→', roundedTargetAmount, 'ETH');
          
          // Convert to wei safely with parseEther protection
          try {
            ethAmount = ethers.parseEther(roundedTargetAmount.toString()).toString();
          } catch (parseError: any) {
            console.warn('⚠️ parseEther failed, using minimum amount:', parseError.message);
            ethAmount = "1000000000000000"; // 0.001 ETH minimum
          }
        } else {
          // Convert XLM to ETH using exchange rate - SAFE CONVERSION
          // For XLM→ETH: orderAmount should be XLM amount, not ETH wei
          console.log('🔍 DEBUG - orderAmount for XLM→ETH conversion (process endpoint):', orderAmount);
          
          // ✅ CORRECT: Get XLM amount from stored order data
          let xlmAmount = 1600; // Default fallback
          
          console.log('🔍 DEBUG - storedOrder data structure:', {
            stellarAmount: storedOrder?.stellarAmount,
            stellar: storedOrder?.stellar,
            orderAmount
          });
          
          // Priority 1: Use stored stellar.amount (readable XLM format)
          if (storedOrder?.stellar?.amount) {
            xlmAmount = parseFloat(storedOrder.stellar.amount);
            console.log('✅ Using storedOrder.stellar.amount (process endpoint):', xlmAmount, 'XLM');
          }
          // Priority 2: Use stellarAmount (stroops) and convert to XLM
          else if (storedOrder?.stellarAmount) {
            const stellarAmountStroops = parseFloat(storedOrder.stellarAmount);
            xlmAmount = stellarAmountStroops / 1e7; // Convert stroops to XLM
            console.log('✅ Using storedOrder.stellarAmount converted (process endpoint):', stellarAmountStroops, 'stroops →', xlmAmount, 'XLM');
          }
          // Priority 3: Try orderAmount if it looks reasonable
          else if (orderAmount && typeof orderAmount === 'string') {
            const numericOrderAmount = parseFloat(orderAmount);
            console.log('🔍 DEBUG - Numeric orderAmount (process endpoint):', numericOrderAmount);
            
            // If it's a reasonable number (< 1M), it's likely XLM
            if (numericOrderAmount > 0 && numericOrderAmount < 1000000) {
              xlmAmount = numericOrderAmount;
              console.log('✅ Using orderAmount as XLM amount (process endpoint):', xlmAmount);
            } else {
              console.log('⚠️ orderAmount seems wrong, using default XLM (process endpoint)');
            }
          }
          
          console.log('🪙 XLM amount for conversion (process endpoint):', xlmAmount);
          console.log('💱 Exchange rate (process endpoint):', exchangeRate, 'XLM per ETH');
          
          // ✅ CORRECT FORMULA: XLM amount / exchange rate = ETH amount
          const ethAmountDecimal = xlmAmount / exchangeRate;
          console.log('🔢 Calculation (process endpoint):', xlmAmount, '÷', exchangeRate, '=', ethAmountDecimal, 'ETH');
          
          // Limit to reasonable ETH amounts (max 10 ETH per transaction)
          const safeEthAmount = Math.min(ethAmountDecimal, 10);
          
          // Round to 6 decimal places to avoid precision issues
          const roundedEthAmount = Math.round(safeEthAmount * 1e6) / 1e6;
          
          // Convert to wei safely with parseEther protection
          try {
            ethAmount = ethers.parseEther(roundedEthAmount.toString()).toString();
          } catch (parseError: any) {
            console.warn('⚠️ parseEther failed, using minimum amount:', parseError.message);
            ethAmount = "1000000000000000"; // 0.001 ETH minimum
          }
          console.log('🔢 SAFE CONVERSION - calculated:', ethAmountDecimal, '→', roundedEthAmount, 'ETH');
        }
        console.log('💱 Using exchange rate:', exchangeRate, 'XLM per ETH (XLM→ETH)');
          console.log('🎯 ETH amount to send:', ethers.formatEther(ethAmount), 'ETH');
          console.log('🏠 Sending to user address:', userEthAddress);
          
          // Create ETH transfer transaction
          const tx = {
            to: userEthAddress,
            value: ethAmount,
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('20', 'gwei')
          };
          
          // Send transaction with retry for rate limiting
          let ethTxResponse;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount <= maxRetries) {
            try {
              ethTxResponse = await relayerWallet.sendTransaction(tx);
              break; // Success, exit retry loop
            } catch (txError: any) {
              retryCount++;
              
              // Enhanced Alchemy rate limiting detection
              const isRateLimit = txError.code === 'UNKNOWN_ERROR' && txError.error?.code === 429 ||
                                txError.code === 429 ||
                                txError.message?.includes('exceeded') ||
                                txError.message?.includes('compute units') ||
                                txError.message?.includes('rate limit') ||
                                txError.error?.message?.includes('exceeded');
              
              if (isRateLimit && retryCount <= maxRetries) {
                const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
                console.log(`⏳ Alchemy rate limit detected (process endpoint, attempt ${retryCount}/${maxRetries}). Error:`, txError.message || txError.error?.message);
                console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
              }
              
              // If not rate limiting or exhausted retries, throw
              console.error('❌ Transaction failed after retries (process endpoint):', txError);
              throw txError;
            }
          }
          console.log('📤 ETH transaction sent:', ethTxResponse.hash);
          
          // Wait for confirmation with retry logic
          let ethTxReceipt;
          let confirmRetryCount = 0;
          const maxConfirmRetries = 3;
          
          while (confirmRetryCount <= maxConfirmRetries) {
            try {
              ethTxReceipt = await ethTxResponse.wait();
              console.log('✅ ETH transaction confirmed!');
              break;
            } catch (confirmError: any) {
              confirmRetryCount++;
              
              // Check for rate limiting during confirmation
              const isRateLimit = confirmError.code === 429 ||
                                confirmError.message?.includes('exceeded') ||
                                confirmError.message?.includes('rate limit');
              
              if (isRateLimit && confirmRetryCount <= maxConfirmRetries) {
                const delayMs = Math.pow(2, confirmRetryCount) * 1000;
                console.log(`⏳ Rate limit during confirmation (process endpoint, attempt ${confirmRetryCount}/${maxConfirmRetries}). Waiting ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
              }
              
              // If not rate limiting or exhausted retries, throw
              console.error('❌ Transaction confirmation failed (process endpoint):', confirmError);
              throw confirmError;
            }
          }
          console.log('🔍 ETH tx hash:', ethTxReceipt?.hash);
          console.log('🌐 View on Etherscan: https://sepolia.etherscan.io/tx/' + ethTxReceipt?.hash);
          
          // Update order status
          storedOrder.status = 'completed';
          storedOrder.ethTxHash = ethTxReceipt?.hash;
          
          // Success response
          res.json({
            success: true,
            orderId,
            ethTxId: ethTxReceipt?.hash,
            message: 'Cross-chain swap completed successfully!',
            details: {
              stellar: {
                txHash: stellarTxHash,
                status: 'confirmed'
              },
              ethereum: {
                txId: ethTxReceipt?.hash,
                amount: `${ethers.formatEther(ethAmount)} ETH`,
                destination: userEthAddress,
                status: 'completed'
              }
            }
          });
          
        } catch (ethError: any) {
          console.error('❌ ETH transaction failed:', ethError);
          res.status(500).json({
            error: 'ETH release failed',
            details: ethError.message
          });
        }
        
        return; // Exit here for XLM→ETH
      }

      // ETH→XLM: Send XLM to user
      if (isEthToXlm) {
        console.log('💰 ETH→XLM: Sending XLM to user...');
      
        // Dynamic import Stellar SDK with better error handling
        try {
        console.log('🔗 Loading Stellar SDK...');
        const { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks, BASE_FEE, Memo } = await import('@stellar/stellar-sdk');
        
        // Setup Stellar server (dynamic network based on stored order)
        const dynamicNetwork = storedOrder.contractType?.includes('ONEINCH') ? 'mainnet' : 'testnet';
        const stellarConfig = NETWORK_CONFIG[dynamicNetwork].stellar;
        const server = new Horizon.Server(stellarConfig.horizonUrl);
        
        console.log(`🔗 Using Stellar ${dynamicNetwork}:`, {
          horizonUrl: stellarConfig.horizonUrl,
          detectedFrom: storedOrder.contractType
        });
        
        // Relayer Stellar keys (from environment)
        const relayerKeypair = Keypair.fromSecret(
          process.env.RELAYER_STELLAR_SECRET || 'SAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        );
        
        console.log(`🔗 Connecting to Stellar ${dynamicNetwork}...`);
        const relayerAccount = await server.loadAccount(relayerKeypair.publicKey());
        console.log('💰 Relayer XLM balance:', relayerAccount.balances.find(b => b.asset_type === 'native')?.balance);

        // Calculate XLM amount to send using real-time rate from frontend
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE; // Use real rate if available
        // Convert wei to ETH first, then calculate XLM amount
        const ethAmount = parseFloat(ethers.formatEther(orderAmount || '1000000000000000')); // Convert wei to ETH
        const xlmAmount = (ethAmount * exchangeRate).toFixed(7);
        console.log('💱 Using exchange rate:', exchangeRate, 'XLM per ETH');
        
        console.log('🎯 Sending to user address:', userStellarAddress);
        console.log('💰 XLM amount to send:', xlmAmount);
        
        // Create payment transaction
        const payment = Operation.payment({
          destination: userStellarAddress,
          asset: Asset.native(), // XLM
          amount: xlmAmount
        });
        
        // Build transaction with dynamic network
        const networkPassphrase = dynamicNetwork === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
        const transaction = new TransactionBuilder(relayerAccount, {
          fee: BASE_FEE,
          networkPassphrase: networkPassphrase
        })
          .addOperation(payment)
          .addMemo(Memo.text(`Bridge:${orderId.substring(0, 20)}`))
          .setTimeout(300)
          .build();
        
        // Sign transaction
        transaction.sign(relayerKeypair);
        console.log('📝 Transaction signed');
        console.log('💫 Sending XLM to:', userStellarAddress);
        
        // Submit to network
        const result = await server.submitTransaction(transaction);
        console.log('✅ Stellar transaction successful!');
        console.log('🔍 Transaction hash:', result.hash);
        console.log('🌐 View on StellarExpert: https://stellar.expert/explorer/' + 
          (DEFAULT_NETWORK_MODE === 'mainnet' ? 'public' : 'testnet') + '/tx/' + result.hash);
        
        // Update order status
        storedOrder.status = 'completed';
        storedOrder.stellarTxHash = result.hash;
        
        // Successful response
        res.json({
          success: true,
          orderId,
          stellarTxId: result.hash,
          message: 'Cross-chain swap completed successfully!',
          details: {
            ethereum: {
              txHash: txHash,
              status: 'confirmed'
            },
            stellar: {
              txId: result.hash,
              amount: `${xlmAmount} XLM`,
              destination: userStellarAddress,
              status: 'completed'
            }
          }
        });

      } catch (stellarError: any) {
        console.error('❌ Stellar transaction failed:', stellarError);
        console.log('Error details:', stellarError.message);
        
        // Fallback to mock response
        const mockTxId = `mock_stellar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        console.log('🔄 Falling back to mock transaction:', mockTxId);
        
        // Use real-time rate for mock response too
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE;
        // Convert wei to ETH first, then calculate XLM amount
        const ethAmountFromWei = parseFloat(ethers.formatEther(orderAmount || '1000000000000000')); // 0.001 ETH default
        const xlmAmount = (ethAmountFromWei * exchangeRate).toFixed(7);
        
        res.json({
          success: true,
          orderId,
          stellarTxId: mockTxId,
          message: 'Cross-chain swap completed (mock mode)',
          error: stellarError.message,
          details: {
            ethereum: {
              status: 'confirmed'
            },
            stellar: {
              txId: mockTxId,
              amount: `${xlmAmount} XLM`,
              destination: userStellarAddress,
              status: 'mock_processing',
              error: 'Stellar transaction failed, using mock'
            }
          }
        });
        }
      } // End of ETH→XLM processing

    } catch (error: any) {
      console.error('❌ Order processing failed:', error);
      res.status(500).json({
        error: 'Order processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // POST /api/orders/xlm-to-eth - Dedicated XLM→ETH processing endpoint  
  app.post('/api/orders/xlm-to-eth', async (req, res) => {
    try {
      console.log('🔍 DEBUG: XLM→ETH endpoint received request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 DEBUG: Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('🔍 DEBUG: Environment check - ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL ? 'SET' : 'NOT SET');
      console.log('🔍 DEBUG: Environment check - RELAYER_PRIVATE_KEY:', process.env.RELAYER_PRIVATE_KEY ? 'SET' : 'NOT SET');
      
      const { orderId, stellarTxHash, stellarAddress, ethAddress, networkMode } = req.body;
      
      // ✅ NETWORK DETECTION: Check request body first, then stored order, then default
      const requestNetwork = networkMode || 
                            (req.query.network as string) || 
                            DEFAULT_NETWORK_MODE;
      
      console.log('🌐 XLM→ETH Endpoint Network Detection:', {
        bodyNetworkMode: networkMode,
        queryNetwork: req.query.network,
        defaultMode: DEFAULT_NETWORK_MODE,
        finalDecision: requestNetwork.toUpperCase()
      });
      
      if (!orderId || !stellarTxHash || !ethAddress) {
        console.log('❌ Missing required fields:', { orderId: !!orderId, stellarTxHash: !!stellarTxHash, ethAddress: !!ethAddress });
        return res.status(400).json({
          error: 'Missing required fields: orderId, stellarTxHash, ethAddress'
        });
      }

      // Normalize Ethereum address (fix checksum)
      const normalizedEthAddress = ethers.getAddress(ethAddress.toLowerCase());

      console.log('💰 XLM→ETH: Processing dedicated endpoint...', { orderId, stellarTxHash, stellarAddress, ethAddress: normalizedEthAddress });
      
      // Get stored order - BYPASSED FOR NOW (in-memory data lost on restart)
      const storedOrder = activeOrders.get(orderId);
      // if (!storedOrder) {
      //   return res.status(404).json({
      //     error: 'Order not found',
      //     orderId
      //   });
      // }

      // Use provided data or defaults if order not found in memory
      const userEthAddress = storedOrder?.ethAddress || normalizedEthAddress;
      const orderAmount = storedOrder?.amount || '10'; // Default for testing
      
      console.log('🎯 XLM→ETH: Sending ETH to user...', { userEthAddress, orderAmount });
      
      try {
        // ✅ NETWORK-AWARE: Use request network first, fallback to stored order
        const orderNetworkMode = requestNetwork || storedOrder?.networkMode || 'mainnet';
        const rpcUrl = orderNetworkMode === 'testnet' 
          ? (process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_SEPOLIA_API_KEY_HERE')
          : (process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_MAINNET_API_KEY_HERE');
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        
        console.log(`🌐 XLM→ETH Network Detection (2nd endpoint): ${orderNetworkMode.toUpperCase()}`);
        
        if (!privateKey) {
          throw new Error('RELAYER_PRIVATE_KEY environment variable is required');
        }
        
        console.log('💰 REAL MODE: Sending actual ETH transaction');
        console.log('🔗 RPC URL:', rpcUrl);
        console.log('🔑 Using real private key:', privateKey.substring(0, 10) + '...');
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const relayerWallet = new ethers.Wallet(privateKey, provider);
        
        console.log('🔑 Relayer ETH address:', relayerWallet.address);
        
        // Get relayer balance with retry logic for Alchemy rate limiting
        console.log('🔍 Getting relayer balance...');
        let balance;
        let balanceRetryCount2 = 0;
        const maxBalanceRetries2 = 5;
        
        while (balanceRetryCount2 <= maxBalanceRetries2) {
          try {
            balance = await provider.getBalance(relayerWallet.address);
            console.log('💰 Relayer ETH balance:', ethers.formatEther(balance), 'ETH');
            break; // Success, exit retry loop
          } catch (error: any) {
            balanceRetryCount2++;
            
            // Check if it's Alchemy rate limiting (code 429)
            if (error?.code === 429 || error?.message?.includes('exceeded') || error?.message?.includes('rate limit')) {
              const delayMs = Math.pow(2, balanceRetryCount2) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s, 32s
              console.log(`⏳ Alchemy rate limit hit (attempt ${balanceRetryCount2}/${maxBalanceRetries2}). Waiting ${delayMs}ms...`);
              
              if (balanceRetryCount2 <= maxBalanceRetries2) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
              }
            }
            
            // If it's not rate limiting or we've exhausted retries, throw
            console.error('❌ Failed to get relayer balance:', error.message);
            throw error;
          }
        }
        
        // Calculate ETH amount to send using real-time rate from frontend  
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE; // Use real rate if available
        let ethAmount;
        if (storedOrder?.targetAmount) {
          console.log('🔍 DEBUG - Raw targetAmount (2nd endpoint):', storedOrder.targetAmount);
          
          // MORE AGGRESSIVE CLEANING - handle very large numbers
          let cleanTargetAmount = storedOrder.targetAmount.toString().replace(/[^0-9.]/g, '');
          let targetAmountNum = parseFloat(cleanTargetAmount);
          
          console.log('🔍 DEBUG - Parsed targetAmount (2nd endpoint):', targetAmountNum);
          
          if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
            console.log('⚠️ Invalid targetAmount, using fallback calculation (2nd endpoint)');
            // Fallback: use amount and exchange rate
            // Convert wei to ETH first, then calculate target amount
            const ethAmountFromWei = parseFloat(ethers.formatEther(orderAmount || '100000000000000000')); // 0.1 ETH default
            targetAmountNum = ethAmountFromWei / exchangeRate;
          }
          
          // EXTREME SAFETY: Max 1 ETH, min 0.000001 ETH
          const safeTargetAmount = Math.min(Math.max(targetAmountNum, 0.000001), 1.0);
          
          // Round to 6 decimal places to avoid precision issues
          const roundedTargetAmount = Math.round(safeTargetAmount * 1e6) / 1e6;
          
          console.log('🔢 SAFE CONVERSION - targetAmount (2nd endpoint):', targetAmountNum, '→', roundedTargetAmount, 'ETH');
          
          // Convert to wei safely
          ethAmount = ethers.parseEther(roundedTargetAmount.toString()).toString();
        } else {
          // Convert XLM to ETH using exchange rate - SAFE CONVERSION
          // For XLM→ETH: orderAmount should be XLM amount, not ETH wei
          console.log('🔍 DEBUG - orderAmount for XLM→ETH conversion:', orderAmount);
          
          // ✅ CORRECT: Get XLM amount from stored order data
          let xlmAmount = 1600; // Default fallback
          
          console.log('🔍 DEBUG - storedOrder data structure (dedicated endpoint):', {
            stellarAmount: storedOrder?.stellarAmount,
            stellar: storedOrder?.stellar,
            orderAmount
          });
          
          // Priority 1: Use stored stellar.amount (readable XLM format)
          if (storedOrder?.stellar?.amount) {
            xlmAmount = parseFloat(storedOrder.stellar.amount);
            console.log('✅ Using storedOrder.stellar.amount (dedicated endpoint):', xlmAmount, 'XLM');
          }
          // Priority 2: Use stellarAmount (stroops) and convert to XLM
          else if (storedOrder?.stellarAmount) {
            const stellarAmountStroops = parseFloat(storedOrder.stellarAmount);
            xlmAmount = stellarAmountStroops / 1e7; // Convert stroops to XLM
            console.log('✅ Using storedOrder.stellarAmount converted (dedicated endpoint):', stellarAmountStroops, 'stroops →', xlmAmount, 'XLM');
          }
          // Priority 3: Try orderAmount if it looks reasonable
          else if (orderAmount && typeof orderAmount === 'string') {
            const numericOrderAmount = parseFloat(orderAmount);
            console.log('🔍 DEBUG - Numeric orderAmount (dedicated endpoint):', numericOrderAmount);
            
            // If it's a reasonable number (< 1M), it's likely XLM
            if (numericOrderAmount > 0 && numericOrderAmount < 1000000) {
              xlmAmount = numericOrderAmount;
              console.log('✅ Using orderAmount as XLM amount (dedicated endpoint):', xlmAmount);
            } else {
              console.log('⚠️ orderAmount seems wrong, using default XLM (dedicated endpoint)');
            }
          }
          
          console.log('🪙 XLM amount for conversion:', xlmAmount);
          console.log('💱 Exchange rate:', exchangeRate, 'XLM per ETH');
          
          // ✅ CORRECT FORMULA: XLM amount / exchange rate = ETH amount
          const ethAmountDecimal = xlmAmount / exchangeRate;
          console.log('🔢 Calculation:', xlmAmount, '÷', exchangeRate, '=', ethAmountDecimal, 'ETH');
          
          // Limit to reasonable ETH amounts (max 10 ETH per transaction)
          const safeEthAmount = Math.min(ethAmountDecimal, 10);
          
          // Round to 6 decimal places to avoid precision issues
          const roundedEthAmount = Math.round(safeEthAmount * 1e6) / 1e6;
          
          // Convert to wei safely with parseEther protection
          try {
            ethAmount = ethers.parseEther(roundedEthAmount.toString()).toString();
          } catch (parseError: any) {
            console.warn('⚠️ parseEther failed, using minimum amount:', parseError.message);
            ethAmount = "1000000000000000"; // 0.001 ETH minimum
          }
        }
        console.log('💱 Using exchange rate:', exchangeRate, 'XLM per ETH (dedicated endpoint)');
        console.log('🎯 ETH amount to send:', ethers.formatEther(ethAmount), 'ETH');
        console.log('🏠 Sending to user address:', userEthAddress);
        
        // Create ETH transfer transaction
        const tx = {
          to: userEthAddress,
          value: ethAmount,
          gasLimit: 21000,
          gasPrice: ethers.parseUnits('20', 'gwei')
        };
        
        // Send transaction with retry for rate limiting
        let ethTxResponse;
        let txRetryCount = 0;
        const maxTxRetries = 3;
        
        while (txRetryCount <= maxTxRetries) {
          try {
            ethTxResponse = await relayerWallet.sendTransaction(tx);
            break; // Success, exit retry loop
          } catch (txError: any) {
            txRetryCount++;
            
            // Enhanced Alchemy rate limiting detection
            const isRateLimit = txError.code === 'UNKNOWN_ERROR' && txError.error?.code === 429 ||
                              txError.code === 429 ||
                              txError.message?.includes('exceeded') ||
                              txError.message?.includes('compute units') ||
                              txError.message?.includes('rate limit') ||
                              txError.error?.message?.includes('exceeded');
            
            if (isRateLimit && txRetryCount <= maxTxRetries) {
              const delayMs = Math.pow(2, txRetryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
              console.log(`⏳ Alchemy rate limit detected (attempt ${txRetryCount}/${maxTxRetries}). Error:`, txError.message || txError.error?.message);
              console.log(`⏳ Waiting ${delayMs}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }
            
            // If not rate limiting or exhausted retries, throw
            console.error('❌ Transaction failed after retries:', txError);
            throw txError;
          }
        }
        console.log('📤 ETH transaction sent:', ethTxResponse.hash);
        
        // Wait for confirmation with retry logic
        let ethTxReceipt;
        let confirmRetryCount = 0;
        const maxConfirmRetries = 3;
        
        while (confirmRetryCount <= maxConfirmRetries) {
          try {
            ethTxReceipt = await ethTxResponse.wait();
            console.log('✅ ETH transaction confirmed!');
            break;
          } catch (confirmError: any) {
            confirmRetryCount++;
            
            // Check for rate limiting during confirmation
            const isRateLimit = confirmError.code === 429 ||
                              confirmError.message?.includes('exceeded') ||
                              confirmError.message?.includes('rate limit');
            
            if (isRateLimit && confirmRetryCount <= maxConfirmRetries) {
              const delayMs = Math.pow(2, confirmRetryCount) * 1000;
              console.log(`⏳ Rate limit during confirmation (attempt ${confirmRetryCount}/${maxConfirmRetries}). Waiting ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }
            
            // If not rate limiting or exhausted retries, throw
            console.error('❌ Transaction confirmation failed:', confirmError);
            throw confirmError;
          }
        }
        console.log('🔍 ETH tx hash:', ethTxReceipt?.hash);
        console.log('🌐 View on Etherscan: https://sepolia.etherscan.io/tx/' + ethTxReceipt?.hash);
        
        // Update order status if found in memory
        if (storedOrder) {
          storedOrder.status = 'completed';
        }
        
        // Success response
        res.json({
          success: true,
          orderId,
          ethTxId: ethTxReceipt?.hash,
          message: 'XLM→ETH swap completed successfully!',
          details: {
            stellar: {
              txHash: stellarTxHash,
              status: 'confirmed'
            },
            ethereum: {
              txId: ethTxReceipt?.hash,
                              amount: `${ethers.formatEther(ethAmount)} ETH`,
              destination: userEthAddress,
              status: 'completed'
            }
          }
        });
        
        console.log('🎉 XLM→ETH swap completed successfully!');
        
      } catch (ethError: any) {
        console.error('❌ ETH transaction failed:', ethError);
        console.error('❌ Full ETH error details:', {
          name: ethError.name,
          message: ethError.message,
          code: ethError.code,
          stack: ethError.stack,
          data: ethError.data
        });
        res.status(500).json({
          error: 'ETH release failed',
          details: ethError.message,
          errorCode: ethError.code,
          errorName: ethError.name
        });
      }

    } catch (error: any) {
      console.error('❌ XLM→ETH processing failed:', error);
      console.error('❌ Error stack trace:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      
      res.status(500).json({
        error: 'XLM→ETH processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('📍 DEBUG: Orders endpoints registered successfully');
  
  // Phase 6.5: EscrowFactory Event Listening
  console.log('🏭 Setting up EscrowFactory event listeners...');
  
  // Setup EscrowFactory contract instance for event listening
  try {
    const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
    const escrowFactoryContract = new ethers.Contract(getEscrowFactoryAddress(), getEscrowFactoryABI(DEFAULT_NETWORK_MODE === 'mainnet'), provider);
    
    // Get relayer wallet for proxy operations
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
    const relayerWallet = new ethers.Wallet(relayerPrivateKey, provider);
    const relayerAddress = relayerWallet.address;
    
    console.log('🔑 Relayer address for proxy operations:', relayerAddress);
    
    // Skip authorization check to reduce API calls and avoid spam
    console.log('💡 To authorize relayer: POST /api/admin/authorize-relayer');
    console.log('⚠️  Skipping authorization check to reduce API rate limit issues');
    
    // Monitor incoming ETH transfers to relayer using simpler approach
    let lastProcessedBlock = await provider.getBlockNumber();
    
    setInterval(async () => {
      try {
        // Add retry logic for block number
        let currentBlock;
        for (let retry = 0; retry < 3; retry++) {
          try {
            currentBlock = await provider.getBlockNumber();
            break;
          } catch (error: any) {
            if (error?.code === 429 && retry < 2) {
              console.log(`⏳ Rate limited getting block number, waiting ${(retry + 1) * 2}s...`);
              await new Promise(resolve => setTimeout(resolve, (retry + 1) * 2000));
              continue;
            }
            throw error;
          }
        }
        
        // Check new blocks for transfers
        for (let blockNum = lastProcessedBlock + 1; blockNum <= currentBlock; blockNum++) {
          const block = await provider.getBlock(blockNum, true);
          if (!block?.transactions) continue;
          
          // Check each transaction
          for (const txHash of block.transactions) {
            // Add retry logic for API calls
            let tx;
            for (let retry = 0; retry < 3; retry++) {
              try {
                tx = await provider.getTransaction(txHash);
                break;
              } catch (error: any) {
                if (error?.code === 429 && retry < 2) {
                  console.log(`⏳ Rate limited, retrying in ${(retry + 1) * 2}s...`);
                  await new Promise(resolve => setTimeout(resolve, (retry + 1) * 2000));
                  continue;
                }
                throw error;
              }
            }
            if (!tx) continue;
            
            // Check if it's ETH transfer to relayer
            if (tx.to === relayerAddress && tx.value && tx.value > 0n) {
              console.log('💰 Incoming ETH transfer detected:', {
                from: tx.from,
                value: ethers.formatEther(tx.value),
                hash: tx.hash
              });
              
              // Find matching order
              for (const [orderId, orderData] of activeOrders.entries()) {
                if (orderData.ethAddress === tx.from && orderData.status === 'pending_relayer_escrow') {
                  console.log(`✅ Matched transfer to order ${orderId}`);
                  
                  // Create escrow on behalf of user
                  await createEscrowForOrder(orderData, orderId, escrowFactoryContract, relayerWallet);
                  break;
                }
              }
            }
          }
        }
        
        lastProcessedBlock = currentBlock;
      } catch (error) {
        console.error('❌ Error monitoring transfers:', error);
      }
    }, RELAYER_CONFIG.pollInterval); // Use configurable poll interval (15s default)
    
    // XLM Payment Monitoring for XLM→ETH orders
    console.log('🌟 Starting Stellar payment monitoring...');
    let lastProcessedStellarLedger = 0;
    
    setInterval(async () => {
      try {
        console.log('🔍 Checking for XLM payments to relayer...');
        
        const networkMode = RELAYER_CONFIG.ethereum.network === 'mainnet' ? 'mainnet' : 'testnet';
        const stellarConfig = NETWORK_CONFIG[networkMode].stellar;
        const { Horizon } = await import('@stellar/stellar-sdk');
        const server = new Horizon.Server(stellarConfig.horizonUrl);
        
        const relayerStellarPublic = process.env.RELAYER_STELLAR_PUBLIC || 'YOUR_STELLAR_PUBLIC_KEY_HERE';
        
        // Get current ledger
        const ledgerResponse = await server.ledgers().order('desc').limit(1).call();
        const currentLedger = parseInt(ledgerResponse.records[0].sequence.toString());
        
        if (lastProcessedStellarLedger === 0) {
          lastProcessedStellarLedger = currentLedger - 10; // Start from 10 ledgers ago
          console.log('🌟 Stellar monitoring initialized, starting from ledger:', lastProcessedStellarLedger);
          return;
        }
        
        // Check payments to relayer since last processed ledger
        const paymentsResponse = await server.payments()
          .forAccount(relayerStellarPublic)
          .cursor((lastProcessedStellarLedger * 4294967296).toString()) // Convert ledger to cursor
          .order('asc')
          .limit(50)
          .call();
        
        for (const payment of paymentsResponse.records) {
          if (payment.type === 'payment' && payment.asset_type === 'native' && payment.to === relayerStellarPublic) {
            console.log('💰 XLM payment detected:', {
              from: payment.from,
              amount: payment.amount,
              txHash: payment.transaction_hash
            });
            
            // Get transaction details to extract memo
            const txResponse = await server.transactions().transaction(payment.transaction_hash).call();
            const memo = txResponse.memo;
            
            if (memo && memo.startsWith('XLM-ETH-')) {
              const orderPrefix = memo.replace('XLM-ETH-', '');
              console.log('🔍 Found XLM→ETH payment with memo:', memo, 'Order prefix:', orderPrefix);
              
              // Find matching pending order
              for (const [orderId, orderData] of activeOrders.entries()) {
                if (orderId.includes(orderPrefix) && orderData.status === 'awaiting_xlm_payment') {
                  console.log('✅ Matched XLM payment to order:', orderId);
                  
                  // Verify payment amount matches expected
                  const expectedXLM = parseFloat(orderData.stellar.amount);
                  const receivedXLM = parseFloat(payment.amount);
                  
                  if (Math.abs(receivedXLM - expectedXLM) < 0.001) { // 0.001 XLM tolerance
                    console.log('💰 XLM amount verified:', receivedXLM, '≈', expectedXLM);
                    
                    // Create ETH HTLC now that XLM is received
                    await createETHHTLCForOrder(orderData, orderId);
                  } else {
                    console.warn('⚠️ XLM amount mismatch:', receivedXLM, 'vs expected:', expectedXLM);
                  }
                  break;
                }
              }
            }
          }
        }
        
        lastProcessedStellarLedger = currentLedger;
        
      } catch (stellarError) {
        console.error('❌ Stellar monitoring error:', stellarError);
      }
    }, 15000); // Check every 15 seconds
    
    // Function to create ETH HTLC after XLM payment received
    async function createETHHTLCForOrder(orderData: any, orderId: string) {
      console.log('🏭 Creating ETH HTLC for verified XLM payment:', orderId);
      
      try {
        const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider);
        
        // Check relayer balance first
        const relayerBalance = await provider.getBalance(relayerWallet.address);
        console.log('💰 Relayer ETH balance:', ethers.formatEther(relayerBalance), 'ETH');
        
        const mainnetHTLCAddress = getHtlcBridgeAddress('mainnet');
        const mainnetHTLCContract = new ethers.Contract(mainnetHTLCAddress, [
          "function createOrder(address token, uint256 amount, bytes32 hashLock, uint256 timelock, address beneficiary, address refundAddress) external payable returns (bytes32 orderId)"
        ], relayerWallet);

        const ethAmountWei = BigInt(orderData.ethAmount);
        const timelockEth = Math.floor(Date.now() / 1000) + 7200; // 2 hours
        
        console.log('🔢 DETAILED ETH HTLC DEBUG:', {
          orderData_ethAmount: orderData.ethAmount,
          ethAmountWei_string: ethAmountWei.toString(),
          ethAmountWei_formatted: ethers.formatEther(ethAmountWei),
          beneficiary: orderData.ethAddress,
          hashLock: orderData.hashLock,
          relayerAddress: relayerWallet.address,
          relayerBalance_ETH: ethers.formatEther(relayerBalance),
          contractAddress: mainnetHTLCAddress
        });

        // Check for insufficient balance
        const estimatedGasCost = ethers.parseEther("0.002"); // ~0.002 ETH for gas
        const totalRequired = ethAmountWei + estimatedGasCost;
        
        console.log('💰 Balance Check:', {
          required_ETH: ethers.formatEther(ethAmountWei),
          gas_estimate_ETH: ethers.formatEther(estimatedGasCost),
          total_required_ETH: ethers.formatEther(totalRequired),
          relayer_balance_ETH: ethers.formatEther(relayerBalance),
          has_sufficient_balance: relayerBalance >= totalRequired
        });
        
        if (relayerBalance < totalRequired) {
          throw new Error(`❌ Insufficient relayer balance! Need ${ethers.formatEther(totalRequired)} ETH, have ${ethers.formatEther(relayerBalance)} ETH`);
        }

        // Create ETH HTLC with retry mechanism
        let ethTx;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
          try {
            ethTx = await mainnetHTLCContract.createOrder(
              '0x0000000000000000000000000000000000000000', // ETH
              ethAmountWei,
              '0x' + orderData.hashLock, // Add 0x prefix for Ethereum contract
              timelockEth,
              orderData.ethAddress, // User gets ETH
              process.env.RELAYER_ETH_ADDRESS!, // Relayer refund
              { value: ethAmountWei }
            );
            break; // Success, exit retry loop
          } catch (createError: any) {
            console.log('🔍 ETH HTLC createOrder error:', createError.code, createError.message);
            
            // Check for rate limiting
            const isRateLimited = (
              createError.code === 'UNKNOWN_ERROR' && 
              createError.error?.code === 429
            ) || (
              createError.message?.includes('compute units per second') ||
              createError.message?.includes('rate limit') ||
              createError.code === 429
            );
            
            if (isRateLimited && retryCount < maxRetries) {
              retryCount++;
              const delay = 3000 * retryCount; // 3s, 6s, 9s
              console.log(`⏳ Alchemy rate limited, retrying ETH HTLC in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw createError; // Re-throw if not rate limiting or max retries reached
            }
          }
        }

        console.log('📝 ETH HTLC TX sent:', ethTx.hash);
        const ethReceipt = await ethTx.wait();
        console.log('✅ ETH HTLC created successfully for order:', orderId);

        // Update order status
        orderData.status = 'eth_htlc_created';
        orderData.ethereum = {
          orderId: ethReceipt.logs[0]?.topics[1],
          txHash: ethTx.hash,
          contractAddress: mainnetHTLCAddress
        };
        
        console.log('🎉 XLM→ETH swap ready! User can now claim ETH with secret:', orderData.secret.substring(0, 10) + '...');
        
      } catch (error) {
        console.error('❌ ETH HTLC creation failed for order:', orderId, error);
        orderData.status = 'eth_htlc_failed';
      }
    }
    
    // Function to create escrow for order
    async function createEscrowForOrder(orderData: any, orderId: string, contract: ethers.Contract, wallet: ethers.Wallet) {
      try {
        console.log(`🏭 Creating escrow for order ${orderId}...`);
        
        // Calculate dynamic safety deposit for this escrow with network awareness
        const orderAmountBigInt = BigInt(orderData.amount);
        const orderNetworkMode = orderData.networkMode || DEFAULT_NETWORK_MODE;
        const actualSafetyDeposit = calculateDynamicSafetyDeposit(orderData.amount, orderNetworkMode);
        
        const totalValue = orderAmountBigInt + actualSafetyDeposit;
        const contractWithSigner = contract.connect(wallet) as any;
        let tx;
        
        // Dinamik method selection - Mainnet vs Testnet
        const isMainnetRequest = orderNetworkMode === 'mainnet';
        
        if (isMainnetRequest) {
                  // MAINNET: Use createDstEscrow (1inch cross-chain resolver pattern)
        console.log('🏭 MAINNET: Using createDstEscrow method (1inch pattern)...');
          
          // Generate order hash
          const orderHash = orderData.orderHash || ethers.keccak256(
            ethers.solidityPacked(
              ['address', 'uint256', 'bytes32', 'uint256'],
              [orderData.ethAddress, orderAmountBigInt, orderData.hashLock, Math.floor(Date.now() / 1000)]
            )
          );
          
          // Prepare createDstEscrow parameters according to 1inch pattern
          const srcChainId = 1; // Ethereum mainnet
          const dstChainId = 1; // Stellar (using 1 as placeholder)
          
          // Create order structure for 1inch createDstEscrow
          const order = {
            maker: orderData.ethAddress,
            taker: '0x0000000000000000000000000000000000000000', // Zero address
            makerAsset: '0x0000000000000000000000000000000000000000', // ETH
            takerAsset: '0x0000000000000000000000000000000000000000', // Target asset (placeholder)
            makingAmount: orderAmountBigInt,
            takingAmount: orderAmountBigInt, // 1:1 for bridge
            salt: ethers.randomBytes(32),
            extension: orderData.hashLock
          };
          
          // Create empty signature for createDstEscrow (will be filled by user)
          const signature = '0x';
          
          // Create taker traits
          const takerTraits = {
            extensionData: orderData.hashLock,
            safetyDeposit: actualSafetyDeposit,
            timelock: orderData.timelock || (Math.floor(Date.now() / 1000) + (2 * 60 * 60))
          };
          
                  // Call createDstEscrow method
        console.log('🚀 Calling createDstEscrow with parameters:', {
            srcChainId,
            orderHash: orderHash.substring(0, 10) + '...',
            makingAmount: ethers.formatEther(order.makingAmount),
            safetyDeposit: ethers.formatEther(actualSafetyDeposit)
          });
          
          // Use createDstEscrow method
          tx = await contractWithSigner.createDstEscrow(
            order,
            signature,
            takerTraits,
            order.makingAmount,
            orderData.hashLock,
            {
              value: totalValue,
              gasLimit: 3000000
            }
          );
        } else {
          // TESTNET: Use createEscrow
          console.log('🏭 TESTNET: Using createEscrow...');
          
          const escrowConfig = {
            token: '0x0000000000000000000000000000000000000000', // ETH
            amount: orderData.amount,
            hashLock: orderData.hashLock,
            timelock: orderData.timelock,
            beneficiary: orderData.ethAddress,
            refundAddress: orderData.ethAddress,
            safetyDeposit: actualSafetyDeposit.toString(),
            chainId: 11155111, // Sepolia
            stellarTxHash: ethers.ZeroHash,
            isPartialFillEnabled: orderData.partialFillEnabled || false
          };
          
          tx = await contractWithSigner.createEscrow(escrowConfig, {
            value: totalValue,
            gasLimit: 3000000
          });
        }
        
        console.log(`📝 Escrow creation tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Escrow created successfully for order ${orderId}`);
        
        // Update order status
        orderData.status = 'escrow_created_by_relayer';
        orderData.escrowTxHash = tx.hash;
        
      } catch (error) {
        console.error(`❌ Failed to create escrow for order ${orderId}:`, error);
        orderData.status = 'escrow_creation_failed';
      }
    }
    
    // Dinamik event listeners - Mainnet vs Testnet
    const isMainnetContract = DEFAULT_NETWORK_MODE === 'mainnet';
    
    if (isMainnetContract) {
      // MAINNET: Gerçek 1inch events
      escrowFactoryContract.on('SrcEscrowCreated', async (srcImmutables, dstImmutablesComplement, event) => {
        console.log('🏭 MAINNET SrcEscrowCreated Event:', {
          orderHash: srcImmutables.orderHash,
          hashlock: srcImmutables.hashlock,
          maker: srcImmutables.maker.toString(),
          taker: srcImmutables.taker.toString(),
          amount: ethers.formatEther(srcImmutables.amount),
          safetyDeposit: ethers.formatEther(srcImmutables.safetyDeposit)
        });
        
        // Find related order and update status
        for (const [orderId, orderData] of activeOrders.entries()) {
          if (orderData.hashLock === srcImmutables.hashlock) {
            console.log(`✅ Matched src escrow ${srcImmutables.orderHash} with order ${orderId}`);
            orderData.orderHash = srcImmutables.orderHash;
            orderData.status = 'src_escrow_created';
            break;
          }
        }
      });
      
      escrowFactoryContract.on('DstEscrowCreated', async (escrowAddress, hashlock, taker, event) => {
        console.log('🏭 MAINNET DstEscrowCreated Event:', {
          escrowAddress,
          hashlock,
          taker: taker.toString()
        });
        
        // Find related order and update status
        for (const [orderId, orderData] of activeOrders.entries()) {
          if (orderData.hashLock === hashlock) {
            console.log(`✅ Matched dst escrow ${escrowAddress} with order ${orderId}`);
            orderData.escrowAddress = escrowAddress;
            orderData.status = 'dst_escrow_created';
            break;
          }
        }
      });
    } else {
      // TESTNET: Bizim custom events
      escrowFactoryContract.on('EscrowCreated', async (escrowId, escrowAddress, resolver, token, amount, hashLock, timelock, safetyDeposit, chainId, event) => {
        console.log('🏭 TESTNET EscrowCreated Event:', {
          escrowId: escrowId.toString(),
          escrowAddress,
          resolver,
          token,
          amount: ethers.formatEther(amount),
          hashLock,
          chainId: chainId.toString(),
          safetyDeposit: ethers.formatEther(safetyDeposit)
        });
        
        // Find related order and update status
        for (const [orderId, orderData] of activeOrders.entries()) {
          if (orderData.hashLock === hashLock) {
            console.log(`✅ Matched escrow ${escrowId} with order ${orderId}`);
            orderData.escrowId = escrowId.toString();
            orderData.escrowAddress = escrowAddress;
            orderData.status = 'escrow_active';
            break;
          }
        }
      });
      
      // Testnet EscrowFunded event
      escrowFactoryContract.on('EscrowFunded', async (escrowId, funder, amount, safetyDeposit, event) => {
        console.log('💰 TESTNET EscrowFunded Event:', {
          escrowId: escrowId.toString(),
          funder,
          amount: ethers.formatEther(amount),
          safetyDeposit: ethers.formatEther(safetyDeposit)
        });
        
        // Update related order status
        for (const [orderId, orderData] of activeOrders.entries()) {
          if (orderData.escrowId === escrowId.toString()) {
            console.log(`✅ Escrow ${escrowId} funded for order ${orderId}`);
            orderData.status = 'escrow_funded';
            break;
          }
        }
      });
    }

    
    console.log('✅ EscrowFactory event listeners set up successfully');
  } catch (error) {
    console.error('❌ Failed to setup EscrowFactory events:', error);
  }

  // Admin endpoints - must be inside initializeRelayer function
  
  // Admin endpoint to authorize relayer
  app.post('/api/admin/authorize-relayer', async (req, res) => {
    try {
      console.log('🔐 Authorizing relayer as resolver...');
      
      const { adminPrivateKey } = req.body;
      if (!adminPrivateKey) {
        return res.status(400).json({
          success: false,
          error: 'Admin private key required'
        });
      }
      
      const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
      const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
      const escrowFactoryContract = new ethers.Contract(getEscrowFactoryAddress(), getEscrowFactoryABI(DEFAULT_NETWORK_MODE === 'mainnet'), adminWallet);
      
      // Get relayer address
      const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
      const relayerWallet = new ethers.Wallet(relayerPrivateKey);
      const relayerAddress = relayerWallet.address;
      
      // Authorize relayer as resolver
      const contractWithSigner = escrowFactoryContract as any;
      const tx = await contractWithSigner.authorizeResolver(relayerAddress);
      
      console.log(`📝 Authorization tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Relayer ${relayerAddress} authorized successfully`);
      
      res.json({
        success: true,
        relayerAddress,
        txHash: tx.hash,
        message: 'Relayer authorized as resolver'
      });
      
    } catch (error) {
      console.error('❌ Failed to authorize relayer:', error);
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        message: 'Relayer authorization failed'
      });
    }
  });

  // Check relayer authorization status
  app.get('/api/admin/relayer-status', async (req, res) => {
    try {
      const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
      const escrowFactoryContract = new ethers.Contract(getEscrowFactoryAddress(), getEscrowFactoryABI(DEFAULT_NETWORK_MODE === 'mainnet'), provider);
      
      const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
      const relayerWallet = new ethers.Wallet(relayerPrivateKey);
      const relayerAddress = relayerWallet.address;
      
      // Check authorization status
      const contractWithProvider = escrowFactoryContract as any;
      const isAuthorized = await contractWithProvider.authorizedResolvers(relayerAddress);
      
      res.json({
        success: true,
        relayerAddress,
        isAuthorized,
        status: isAuthorized ? 'Authorized' : 'Not Authorized',
        message: isAuthorized ? 'Relayer can create escrows' : 'Relayer needs authorization'
      });
      
    } catch (error) {
      console.error('❌ Failed to check relayer status:', error);
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        message: 'Status check failed'
      });
    }
  });

  console.log('✅ Admin endpoints registered');

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DEBUG ENDPOINT
  // ═══════════════════════════════════════════════════════════════════════════════════════
  
  app.post('/api/debug/body', (req, res) => {
    console.log('DEBUG: Request body:', req.body);
    console.log('DEBUG: Request headers:', req.headers);
    res.json({
      success: true,
      body: req.body,
      headers: req.headers
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════
            // 1INCH ESCROW FACTORY ENDPOINTS - Using createDstEscrow approach
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // Get escrow factory information
  app.get('/api/escrow/info', async (req, res) => {
    try {
      console.log('🏭 Getting 1inch Escrow Factory info...');
      
      const escrowFactoryAddress = getEscrowFactoryAddress('mainnet');
      
      res.json({
        success: true,
        escrowFactory: escrowFactoryAddress,
                    method: 'createDstEscrow',
        note: 'Using 1inch cross-chain resolver pattern'
      });
      
    } catch (error: any) {
      console.error('❌ Failed to get escrow info:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('✅ Escrow Factory endpoints registered');

  // Start HTTP server
  const server = app.listen(RELAYER_CONFIG.port, () => {
    console.log(`🌐 HTTP server started on port ${RELAYER_CONFIG.port}`);
  });
  
  console.log('✅ Relayer service initialized successfully');
  console.log('🎯 Ready to process cross-chain swaps');
}

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('\n🛑 Shutting down relayer service...');
  
  try {
    await ethereumListener.stopListening();
    console.log('✅ Ethereum listener stopped');
  } catch (error) {
    console.error('❌ Error stopping Ethereum listener:', error);
  }
  
  console.log('👋 Relayer service shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Create Express app globally
const app = express();

// ===== PHASE 4: EVENT SYSTEM INITIALIZATION =====

// Initialize event system components
const eventManager = new FusionEventManager(ordersService);
const eventHistoryManager = new EventHistoryManager();
const clientSubscriptionManager = new ClientSubscriptionManager(eventManager);
const rpcHandler = new FusionRpcHandler(ordersService, eventManager);

// Set up event system integrations
eventManager.setProgressiveFillManager(undefined); // Will be set when progressive fills are available

// Connect event manager to event history
eventManager.on('any', (event) => {
  eventHistoryManager.addEvent(event);
});

console.log('✅ Phase 4: Event System initialized');

// ===== PHASE 3.5: RESOLVER INTEGRATION INITIALIZATION =====



// ===== PHASE 5: RECOVERY SYSTEM INITIALIZATION =====

// Initialize recovery configuration
const recoveryConfig: RecoveryConfig = {
  monitoringInterval: 30000, // 30 seconds
  autoRefundEnabled: true,
  emergencyEnabled: true,
  maxRetries: 3,
  retryDelay: 60000, // 1 minute
  gracePeriod: 300 // 5 minutes after timelock
};

// Initialize recovery service
const recoveryService = new RecoveryService(ordersService, eventManager, recoveryConfig);

// Connect recovery service to event system
recoveryService.on('recoveryCompleted', (event) => {
  console.log(`✅ Recovery completed: ${event.recoveryId}`);
});

recoveryService.on('recoveryFailed', (event) => {
  console.log(`❌ Recovery failed: ${event.recoveryId} - ${event.error}`);
});

console.log('✅ Phase 5: Recovery System initialized');

// ===== PHASE 4: EVENT SYSTEM ENDPOINTS =====

// RPC endpoint for all RPC methods
app.post('/api/rpc', async (req, res) => {
  try {
    const { method, params, id } = req.body;
    
    if (!method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: id || null
      });
    }

    const result = await rpcHandler.handleRpcRequest({
      id: id || 'test-req',
      method: method as any,
      params: params || [],
      timestamp: Date.now()
    }, 'test-client');
    
    res.json({
      jsonrpc: '2.0',
      result,
      id: id || null
    });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: req.body.id || null
    });
  }
});

// Test event trigger endpoint
app.post('/api/trigger-test-events', async (req, res) => {
  try {
    const { eventType, count = 1 } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      // Generate test events using triggerTestEvents
      const testOrderHash = `test-order-${Date.now()}-${i}`;
      eventManager.triggerTestEvents(testOrderHash);
      
      // Create a simple event for response
      const event = {
        eventId: `test-${Date.now()}-${i}`,
        eventType: eventType,
        timestamp: Date.now(),
        data: { orderHash: testOrderHash },
        metadata: { source: 'test-trigger' }
      };
      results.push(event);
    }

    res.json({
      success: true,
      eventsGenerated: results.length,
      events: results
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger test events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Event history endpoint
app.get('/api/events', async (req, res) => {
  try {
    const { limit, offset, eventType, orderId } = req.query;
    
    const result = eventHistoryManager.queryEvents({
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      eventTypes: eventType ? [eventType as any] : undefined,
      orderHashes: orderId ? [orderId as string] : undefined
    });
    
    const events = result.events;

    res.json({
      success: true,
      events,
      total: events.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get event history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Client subscription endpoint
app.post('/api/subscribe', async (req, res) => {
  try {
    const { clientId, events, orderIds, resolvers, chains } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const subscriptionId = clientSubscriptionManager.createSubscription({
      clientId,
      eventTypes: events || [],
      filters: {
        orderHashes: orderIds || [],
        resolvers: resolvers || [],
        chainIds: chains || []
      }
    });

    res.json({
      success: true,
      subscriptionId
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});





// Detailed metrics endpoint
app.get('/metrics', (req, res) => {
  try {
    const monitor = getMonitor();
    const metrics = monitor.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('❌ Metrics fetch failed:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Uptime endpoint
app.get('/uptime', (req, res) => {
  try {
    const monitor = getMonitor();
    const metrics = monitor.getMetrics();
    res.json({
      uptime: metrics.uptime,
      startTime: metrics.timestamp - metrics.uptime,
      currentTime: metrics.timestamp,
      status: monitor.getSystemStatus()
    });
  } catch (error) {
    console.error('❌ Uptime check failed:', error);
    res.status(500).json({
      error: 'Failed to fetch uptime',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== QUOTER API ENDPOINTS =====

// GET /quote/receive - Basic quote
app.get('/quote/receive', async (req, res) => {
  try {
    const params = req.query as any;
    const validation = validateQuoteRequest(params);
    
    if (!validation.valid) {
      return res.status(400).json(createErrorResponse(validation.error!));
    }

    // Map legacy QuoteRequest to new format
    const mappedParams = {
      fromToken: params.srcTokenAddress,
      toToken: params.dstTokenAddress,
      fromChain: params.srcChain?.toString() || 'ethereum',
      toChain: params.dstChain?.toString() || 'stellar',
      amount: params.amount,
      slippage: params.fee || 0.5,
      userAddress: params.walletAddress,
      preset: 'medium' as const
    };

    const quote = await quoterService.getQuote(mappedParams);
    res.json(quote);

    console.log('💰 Quote generated:', quote.quoteId);
  } catch (error) {
    console.error('❌ Quote generation failed:', error);
    res.status(500).json(createErrorResponse('Quote generation failed', error instanceof Error ? error.message : 'Unknown error'));
  }
});

// POST /quote/receive - Custom preset quote
app.post('/quote/receive', async (req, res) => {
  try {
    const params = req.body as QuoteRequest;
    const validation = validateQuoteRequest(params);
    
    if (!validation.valid) {
      return res.status(400).json(createErrorResponse(validation.error!));
    }

    // Map legacy QuoteRequest to new format
    const mappedParams = {
      fromToken: params.srcTokenAddress,
      toToken: params.dstTokenAddress,
      fromChain: params.srcChain?.toString() || 'ethereum',
      toChain: params.dstChain?.toString() || 'stellar',
      amount: params.amount,
      slippage: params.fee || 0.5,
      userAddress: params.walletAddress,
      preset: 'medium' as const
    };

    const quote = await quoterService.getQuote(mappedParams);
    res.json(quote);

    console.log('💰 Custom quote generated:', quote.quoteId);
  } catch (error) {
    console.error('❌ Custom quote generation failed:', error);
    res.status(500).json(createErrorResponse('Quote generation failed', error instanceof Error ? error.message : 'Unknown error'));
  }
});

// POST /quote/build - Build order
app.post('/quote/build', async (req, res) => {
  try {
    const { quoteId, preset = 'fast' } = req.body;
    
    if (!quoteId) {
      return res.status(400).json(createErrorResponse('Quote ID is required'));
    }

    const quote = quoterService.getQuoteById(quoteId);
    if (!quote) {
      return res.status(404).json(createErrorResponse('Quote not found'));
    }

    const orderData = {
      quoteId: quote.quoteId,
      order: quote,
      preset,
      timestamp: Date.now()
    };
    
    res.json(orderData);

    console.log('🔨 Order built for quote:', quote.quoteId);
  } catch (error) {
    console.error('❌ Order building failed:', error);
    res.status(500).json(createErrorResponse('Order building failed', getErrorMessage(error)));
  }
});

// ===== GAS TRACKING API ENDPOINTS =====

// GET /gas/current - Get current gas prices
app.get('/gas/current', async (req, res) => {
  try {
    const gasPrice = gasPriceTracker.getCurrentGasPrice();
    res.json(createSuccessResponse(gasPrice));
  } catch (error) {
    console.error('❌ Gas price fetch failed:', error);
    res.status(500).json(createErrorResponse('Gas price fetch failed', getErrorMessage(error)));
  }
});

// GET /gas/history - Get gas price history
app.get('/gas/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const history = gasPriceTracker.getGasPriceHistory(limit);
    res.json(createSuccessResponse(history));
  } catch (error) {
    console.error('❌ Gas history fetch failed:', error);
    res.status(500).json(createErrorResponse('Gas history fetch failed', getErrorMessage(error)));
  }
});

// GET /gas/congestion - Get network congestion
app.get('/gas/congestion', async (req, res) => {
  try {
    const congestion = gasPriceTracker.getNetworkCongestion();
    res.json(createSuccessResponse(congestion));
  } catch (error) {
    console.error('❌ Congestion fetch failed:', error);
    res.status(500).json(createErrorResponse('Congestion fetch failed', getErrorMessage(error)));
  }
});

// GET /gas/recommendation - Get gas price recommendation
app.get('/gas/recommendation', async (req, res) => {
  try {
    const auctionDuration = req.query.duration ? parseInt(req.query.duration as string) : 180;
    const recommendation = gasPriceTracker.getAuctionGasRecommendation(auctionDuration);
    res.json(createSuccessResponse(recommendation));
  } catch (error) {
    console.error('❌ Gas recommendation failed:', error);
    res.status(500).json(createErrorResponse('Gas recommendation failed', getErrorMessage(error)));
  }
});

// ===== PRESET MANAGEMENT API ENDPOINTS =====

// GET /presets - Get all presets
app.get('/presets', async (req, res) => {
  try {
    const presets = presetManager.getAllPresets();
    res.json(createSuccessResponse(presets));
  } catch (error) {
    console.error('❌ Presets fetch failed:', error);
    res.status(500).json(createErrorResponse('Presets fetch failed', getErrorMessage(error)));
  }
});

// GET /presets/:id - Get preset by ID
app.get('/presets/:id', async (req, res) => {
  try {
    const preset = presetManager.getPreset(req.params.id);
    if (!preset) {
      return res.status(404).json(createErrorResponse('Preset not found'));
    }
    res.json(createSuccessResponse(preset));
  } catch (error) {
    console.error('❌ Preset fetch failed:', error);
    res.status(500).json(createErrorResponse('Preset fetch failed', getErrorMessage(error)));
  }
});

// POST /presets - Create new preset
app.post('/presets', async (req, res) => {
  try {
    const preset = presetManager.createPreset(req.body);
    res.status(201).json(createSuccessResponse(preset));
  } catch (error) {
    console.error('❌ Preset creation failed:', error);
    res.status(500).json(createErrorResponse('Preset creation failed', getErrorMessage(error)));
  }
});

// PUT /presets/:id - Update preset
app.put('/presets/:id', async (req, res) => {
  try {
    const preset = presetManager.updatePreset(req.params.id, req.body);
    if (!preset) {
      return res.status(404).json(createErrorResponse('Preset not found'));
    }
    res.json(createSuccessResponse(preset));
  } catch (error) {
    console.error('❌ Preset update failed:', error);
    res.status(500).json(createErrorResponse('Preset update failed', getErrorMessage(error)));
  }
});

// DELETE /presets/:id - Delete preset
app.delete('/presets/:id', async (req, res) => {
  try {
    const deleted = presetManager.deletePreset(req.params.id);
    if (!deleted) {
      return res.status(404).json(createErrorResponse('Preset not found'));
    }
    res.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    console.error('❌ Preset deletion failed:', error);
    res.status(500).json(createErrorResponse('Preset deletion failed', getErrorMessage(error)));
  }
});

// POST /presets/recommend - Get recommended preset
app.post('/presets/recommend', async (req, res) => {
  try {
    const { amount, fromChain, toChain, urgency = 'medium' } = req.body;
    const preset = presetManager.getRecommendedPreset(amount, fromChain, toChain, urgency);
    res.json(createSuccessResponse(preset));
  } catch (error) {
    console.error('❌ Preset recommendation failed:', error);
    res.status(500).json(createErrorResponse('Preset recommendation failed', getErrorMessage(error)));
  }
});

// GET /presets/stats/:id - Get preset statistics
app.get('/presets/stats/:id', async (req, res) => {
  try {
    const stats = presetManager.getPresetStats(req.params.id);
    if (!stats) {
      return res.status(404).json(createErrorResponse('Preset not found'));
    }
    res.json(createSuccessResponse(stats));
  } catch (error) {
    console.error('❌ Preset stats fetch failed:', error);
    res.status(500).json(createErrorResponse('Preset stats fetch failed', getErrorMessage(error)));
  }
});

// POST /presets/optimize - Optimize all presets
app.post('/presets/optimize', async (req, res) => {
  try {
    presetManager.optimizePresets();
    res.json(createSuccessResponse({ optimized: true }));
  } catch (error) {
    console.error('❌ Preset optimization failed:', error);
    res.status(500).json(createErrorResponse('Preset optimization failed', getErrorMessage(error)));
  }
});

  // Test endpoint for EscrowFactory
  app.get('/api/escrow/test', async (req, res) => {
    try {
      console.log('🧪 Testing EscrowFactory connection...');
      
      const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
      const escrowFactoryContract = new ethers.Contract(getEscrowFactoryAddress(), getEscrowFactoryABI(DEFAULT_NETWORK_MODE === 'mainnet'), provider);
      
      // Get basic contract info
      const [totalEscrows, minSafetyDeposit, maxSafetyDeposit] = await Promise.all([
        escrowFactoryContract.totalEscrows(),
        escrowFactoryContract.MIN_SAFETY_DEPOSIT(),
        escrowFactoryContract.MAX_SAFETY_DEPOSIT()
      ]);
      
      res.json({
        success: true,
        escrowFactoryAddress: getEscrowFactoryAddress(),
        contractInfo: {
          totalEscrows: totalEscrows.toString(),
          minSafetyDeposit: ethers.formatEther(minSafetyDeposit),
          maxSafetyDeposit: ethers.formatEther(maxSafetyDeposit)
        },
        message: 'EscrowFactory bağlantısı başarılı!'
      });
    } catch (error) {
      console.error('❌ EscrowFactory test failed:', error);
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        message: 'EscrowFactory test failed'
      });
    }
  });

  // Get escrow details endpoint
  app.get('/api/escrow/:escrowId', async (req, res) => {
    try {
      const escrowId = req.params.escrowId;
      console.log(`🔍 Getting escrow details for ID: ${escrowId}`);
      
      const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
      const escrowFactoryContract = new ethers.Contract(getEscrowFactoryAddress(), getEscrowFactoryABI(DEFAULT_NETWORK_MODE === 'mainnet'), provider);
      
      const escrowData = await escrowFactoryContract.getEscrow(escrowId);
      
      res.json({
        success: true,
        escrowId,
        escrowData: {
          escrowAddress: escrowData.escrowAddress,
          config: {
            token: escrowData.config.token,
            amount: ethers.formatEther(escrowData.config.amount),
            hashLock: escrowData.config.hashLock,
            timelock: new Date(Number(escrowData.config.timelock) * 1000).toISOString(),
            beneficiary: escrowData.config.beneficiary,
            refundAddress: escrowData.config.refundAddress,
            safetyDeposit: ethers.formatEther(escrowData.config.safetyDeposit),
            chainId: escrowData.config.chainId.toString(),
            stellarTxHash: escrowData.config.stellarTxHash,
            isPartialFillEnabled: escrowData.config.isPartialFillEnabled
          },
          status: escrowData.status,
          createdAt: new Date(Number(escrowData.createdAt) * 1000).toISOString(),
          filledAmount: ethers.formatEther(escrowData.filledAmount),
          safetyDepositPaid: ethers.formatEther(escrowData.safetyDepositPaid),
          resolver: escrowData.resolver,
          isActive: escrowData.isActive
        }
      });
    } catch (error) {
      console.error('❌ Get escrow failed:', error);
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        message: 'Escrow bilgileri alınamadı'
      });
    }
  });

  // Auto-authorize user endpoint  
  app.post('/api/admin/authorize-user', async (req, res) => {
    try {
      console.log('🔐 Auto-authorizing user as resolver...');
      
      const { userAddress, adminPrivateKey } = req.body;
      if (!userAddress || !adminPrivateKey) {
        return res.status(400).json({
          success: false,
          error: 'User address and admin private key required'
        });
      }
      
      const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
      const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
      const escrowFactoryContract = new ethers.Contract(getEscrowFactoryAddress(), getEscrowFactoryABI(DEFAULT_NETWORK_MODE === 'mainnet'), adminWallet);
      
      // Check if already authorized
      const contractWithProvider = escrowFactoryContract as any;
      const isAlreadyAuthorized = await contractWithProvider.authorizedResolvers(userAddress);
      
      if (isAlreadyAuthorized) {
        return res.json({
          success: true,
          userAddress,
          message: 'User already authorized',
          alreadyAuthorized: true
        });
      }
      
      // Authorize user as resolver
      const contractWithSigner = escrowFactoryContract as any;
      const tx = await contractWithSigner.authorizeResolver(userAddress);
      
      console.log(`📝 User authorization tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ User ${userAddress} authorized successfully`);
      
      res.json({
        success: true,
        userAddress,
        txHash: tx.hash,
        message: 'User authorized as resolver',
        alreadyAuthorized: false
      });
      
    } catch (error) {
      console.error('❌ Failed to authorize user:', error);
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        message: 'User authorization failed'
      });
    }
  });





// Function to process Escrow deployment and send XLM to user
async function processEscrowToStellar(orderId: string, storedOrder: any) {
  console.log(`🔄 Processing Escrow → Stellar transfer for order ${orderId}...`);
  
  try {
    // Dynamic import Stellar SDK
    const { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks, BASE_FEE, Memo } = 
      await import('@stellar/stellar-sdk');
    
    // Setup Stellar network (mainnet for escrow orders)
    const stellarConfig = NETWORK_CONFIG.mainnet.stellar;
    const server = new Horizon.Server(stellarConfig.horizonUrl);
    
    console.log('🔗 Using Stellar Mainnet for escrow completion');
    
    // Relayer Stellar keys
    const relayerKeypair = Keypair.fromSecret(
      process.env.RELAYER_STELLAR_SECRET_MAINNET || 
      process.env.RELAYER_STELLAR_SECRET ||
      'SAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    
    const relayerAccount = await server.loadAccount(relayerKeypair.publicKey());
    console.log('💰 Relayer XLM balance:', relayerAccount.balances.find(b => b.asset_type === 'native')?.balance);
    
    // Calculate XLM amount based on exchange rate
    const exchangeRate = storedOrder.exchangeRate || ETH_TO_XLM_RATE;
    const xlmAmount = (parseFloat(storedOrder.amount) * exchangeRate).toFixed(7);
    
    console.log('💱 Exchange rate:', exchangeRate, 'XLM per ETH');
    console.log('🎯 Sending XLM to:', storedOrder.stellarAddress);
    console.log('💰 XLM amount:', xlmAmount);
    
    // Create payment to user on Stellar (simplified approach)
    const payment = Operation.payment({
      destination: storedOrder.stellarAddress,
      asset: Asset.native(),
      amount: xlmAmount
    });
    
    // Build transaction
    const transaction = new TransactionBuilder(relayerAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC // Mainnet
    })
      .addOperation(payment)
      .addMemo(Memo.text(`EscrowBridge:${orderId.substring(0, 20)}`))
      .setTimeout(300)
      .build();
    
    // Sign and submit
    transaction.sign(relayerKeypair);
    const result = await server.submitTransaction(transaction);
    
    console.log('✅ XLM payment sent:', result.hash);
    console.log('🌐 View on Stellar Explorer:', `https://stellarchain.io/transactions/${result.hash}`);
    
    // Update order status
    storedOrder.status = 'completed';
    storedOrder.stellarTxHash = result.hash;
    storedOrder.completedAt = new Date().toISOString();
    
    console.log(`🎉 Escrow bridge completed for order ${orderId}!`);
    
  } catch (error) {
    console.error(`❌ Failed to process Escrow → Stellar transfer:`, error);
    
    // Update order status to error
    storedOrder.status = 'stellar_transfer_failed';
    storedOrder.error = error instanceof Error ? error.message : 'Unknown error';
  }
}

// Start relayer (always initialize when module loads)
  initializeRelayer().catch(error => {
    console.error('❌ Failed to initialize relayer:', error);
    process.exit(1);
  });

console.log('🔄 Relayer service configured and ready');

export default { RELAYER_CONFIG, initializeRelayer }; 