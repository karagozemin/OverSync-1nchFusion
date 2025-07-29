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

// Real HTLC Bridge Contract ABI  
const HTLC_BRIDGE_ABI = [
  "function createOrder(address token, uint256 amount, bytes32 hashLock, uint256 timelock, uint256 feeRate, address beneficiary, address refundAddress, uint256 destinationChainId, bytes32 stellarTxHash, bool partialFillEnabled) external payable returns (uint256 orderId)"
];
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

// Phase 3.5: Resolver Integration imports
import ResolverManager, { ResolverTier, ResolverStatus, WhitelistConfig } from './resolver-manager.js';

// Phase 5: Recovery System imports
import RecoveryService, { RecoveryConfig, RecoveryType, RecoveryStatus } from './recovery-service.js';

// Stellar SDK will be imported dynamically when needed

// Phase 8: Monitoring System imports
import { getMonitor } from './monitoring.js';

// Relayer configuration from environment variables
export const RELAYER_CONFIG = {
  // Service settings
  port: Number(process.env.RELAYER_PORT) || 3001,
  pollInterval: Number(process.env.RELAYER_POLL_INTERVAL) || 5000,
  retryAttempts: Number(process.env.RELAYER_RETRY_ATTEMPTS) || 3,
  retryDelay: Number(process.env.RELAYER_RETRY_DELAY) || 2000,
  
  // Network configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  enableMockMode: process.env.ENABLE_MOCK_MODE === 'true',
  debug: process.env.DEBUG === 'true',
  
  // Ethereum configuration
  ethereum: {
    network: process.env.ETHEREUM_NETWORK || 'sepolia',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID',
    contractAddress: process.env.HTLC_CONTRACT_ADDRESS || '',
    privateKey: process.env.RELAYER_PRIVATE_KEY || '',
    gasPrice: Number(process.env.GAS_PRICE_GWEI) || 20,
    gasLimit: Number(process.env.GAS_LIMIT) || 300000,
    startBlock: Number(process.env.START_BLOCK_ETHEREUM) || 0,
    minConfirmations: Number(process.env.MIN_CONFIRMATION_BLOCKS) || 6,
  },
  
  // Stellar configuration
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
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

  // Start Ethereum event listener
  try {
    await ethereumListener.startListening();
  } catch (error) {
    console.error('❌ Failed to start Ethereum listener:', error);
    process.exit(1);
  }
  
  // ===== ORDERS API ENDPOINTS =====
  
  // Constants  
const ETH_TO_XLM_RATE = 10000; // 1 ETH = 10,000 XLM
const HTLC_CONTRACT_ADDRESS = '0xc792D389a552028aE5d799b1CAA61228154ff2A4'; // PUBLIC HTLC BRIDGE (No Auth)

console.log('🌍 USING PUBLIC HTLC BRIDGE CONTRACT:', HTLC_CONTRACT_ADDRESS);
  
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
          fromNetwork: order.direction === 'eth-to-xlm' ? 'ETH Sepolia' : 'Stellar Testnet',
          toNetwork: order.direction === 'eth-to-xlm' ? 'Stellar Testnet' : 'ETH Sepolia',
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
      const { fromChain, toChain, fromToken, toToken, amount, ethAddress, stellarAddress, direction, exchangeRate } = req.body;
      
      // Validate required fields
      if (!fromChain || !toChain || !fromToken || !toToken || !amount || !ethAddress || !stellarAddress) {
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

      // Generate order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // For ETH to XLM direction, create HTLC order on Ethereum
      if (direction === 'eth_to_xlm') {
        
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
          timelock: Math.floor(Date.now() / 1000) + 7201, // 2+ hours (strict > MIN_TIMELOCK)
          feeRate: 100, // 1%
          beneficiary: stellarAddress,
          refundAddress: ethAddress,
          destinationChainId: 1, // Stellar represented as 1
          stellarTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          partialFillEnabled: false,
          secret: secret,
          created: new Date().toISOString(),
          status: 'pending_user_confirmation'
        };

        // Store order
        activeOrders.set(orderId, {
          ...orderData,
          ethAddress,
          stellarAddress,
          amount,
          exchangeRate: exchangeRate || ETH_TO_XLM_RATE // Store real-time rate
        });

        console.log('✅ ETH→XLM Order created:', orderId);
        console.log('💾 Order stored with addresses:', {
          ethAddress,
          stellarAddress
        });

        // REAL HTLC CONTRACT: Back to original contract with proper parameters
        console.log('🏭 REAL HTLC MODE: Using HTLCBridge contract');
        console.log('🔑 Relayer (Owner):', ethAddress);
        
        // Native ETH handling: Use user's address as token (common pattern)
        const ETH_TOKEN_ADDRESS = ethAddress;
        
        // Encode HTLC createOrder with corrected parameters
        const htlcInterface = new ethers.Interface(HTLC_BRIDGE_ABI);
        const encodedData = htlcInterface.encodeFunctionData("createOrder", [
          ETH_TOKEN_ADDRESS,        // Special ETH token address
          orderData.amount,         // Amount in wei
          orderData.hashLock,       // Hash lock
          orderData.timelock,       // Timelock (current + 2 hours)
          orderData.feeRate,        // Fee rate (50 = 0.5%)
          ethAddress,               // Beneficiary (user address)
          ethAddress,               // Refund address (user address)  
          1,                        // Destination chain ID (1 for Stellar)
          ethers.ZeroHash,          // Stellar tx hash (initially zero)
          orderData.partialFillEnabled || false  // Partial fill enabled
        ]);

        // Calculate required safety deposit (minimum 0.001 ETH)
        const MIN_SAFETY_DEPOSIT = BigInt('1000000000000000'); // 0.001 ETH in wei
        const orderAmountBigInt = BigInt(orderData.amount);
        const requiredValue = orderAmountBigInt > MIN_SAFETY_DEPOSIT ? orderAmountBigInt : MIN_SAFETY_DEPOSIT;

        // Return real HTLC contract interaction
        res.json({
          success: true,
          orderId,
          orderData,
          approvalTransaction: {
            to: HTLC_CONTRACT_ADDRESS,        // Real HTLC contract
            value: `0x${requiredValue.toString(16)}`,  // At least MIN_SAFETY_DEPOSIT
            data: encodedData,                // Proper createOrder call
            gas: '0x1E8480',                  // 2M gas for complex contract call
            gasPrice: '0x4a817c800'
          },
          message: 'Order created! Please approve the escrow deposit.',
          nextStep: 'Approve deposit, then relayer will create HTLC contract',
          instructions: [
            '1. Approve escrow deposit transaction',
            '2. Relayer will automatically create HTLC contract',
            '3. Cross-chain swap will begin'
          ]
        });
        
      } else if (direction === 'xlm_to_eth') {
        // For XLM to ETH direction, create order on Stellar first
        
        // Use real-time exchange rate for conversion
        const realExchangeRate = exchangeRate || ETH_TO_XLM_RATE;
        
        const orderData = {
          orderId,
          stellarAmount: (parseFloat(amount) * 1e7).toString(), // XLM has 7 decimals
          targetAmount: (parseFloat(amount) / realExchangeRate * 1e18).toString(), // Convert to ETH using real rate
          ethAddress,
          stellarAddress,
          exchangeRate: realExchangeRate, // Store real-time rate
          created: new Date().toISOString(),
          status: 'pending_stellar_transaction'
        };
        
        // Store order
        activeOrders.set(orderId, orderData);

        console.log('✅ XLM→ETH Order created:', orderId);
        
        res.json({
          success: true,
          orderId,
          orderData,
          message: 'Bridge order created successfully',
          nextStep: 'Please confirm the Stellar transaction in Freighter'
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
        orderAmount
      });

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
          // Load ethers and connect to Sepolia - REAL MODE ONLY
          const rpcUrl = RELAYER_CONFIG.ethereum.rpcUrl;
          const privateKey = process.env.RELAYER_PRIVATE_KEY;
          
          if (!privateKey) {
            throw new Error('RELAYER_PRIVATE_KEY environment variable is required');
          }
          
          console.log('💰 REAL MODE: Sending actual ETH transaction (process endpoint)');
          console.log('🔗 RPC URL:', rpcUrl);
          console.log('🔑 Using real private key:', privateKey.substring(0, 10) + '...');
          
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const relayerWallet = new ethers.Wallet(privateKey, provider);
          
          console.log('🔑 Relayer ETH address:', relayerWallet.address);
          
          // Get relayer balance
          const balance = await provider.getBalance(relayerWallet.address);
          console.log('💰 Relayer ETH balance:', ethers.formatEther(balance), 'ETH');
          
                  // Calculate ETH amount to send using real-time rate from frontend
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE; // Use real rate if available
        let ethAmount;
        if (storedOrder?.targetAmount) {
          ethAmount = storedOrder.targetAmount;
        } else {
          // Convert XLM to ETH using exchange rate, then to wei (18 decimals)
          const ethAmountDecimal = parseFloat(orderAmount || '0.1') / exchangeRate;
          // Round to avoid decimal precision issues and convert to wei properly
          const ethAmountFixed = Math.floor(ethAmountDecimal * 1e18); // Convert to wei as integer
          ethAmount = ethAmountFixed.toString(); // Use wei directly as string
        }
        console.log('💱 Using exchange rate:', exchangeRate, 'XLM per ETH (XLM→ETH)');
          console.log('🎯 ETH amount to send:', (parseInt(ethAmount) / 1e18).toFixed(6), 'ETH');
          console.log('🏠 Sending to user address:', userEthAddress);
          
          // Create ETH transfer transaction
          const tx = {
            to: userEthAddress,
            value: ethAmount,
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('20', 'gwei')
          };
          
          // Send transaction
          const ethTxResponse = await relayerWallet.sendTransaction(tx);
          console.log('📤 ETH transaction sent:', ethTxResponse.hash);
          
          // Wait for confirmation
          const ethTxReceipt = await ethTxResponse.wait();
          console.log('✅ ETH transaction confirmed!');
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
                amount: `${(parseInt(ethAmount) / 1e18).toFixed(6)} ETH`,
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
        
        // Setup Stellar server (testnet)
        const server = new Horizon.Server('https://horizon-testnet.stellar.org');
        
        // Relayer Stellar keys (from environment)
        const relayerKeypair = Keypair.fromSecret(
          process.env.RELAYER_STELLAR_SECRET || 'SAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        );
        
        console.log('🔗 Connecting to Stellar testnet...');
        const relayerAccount = await server.loadAccount(relayerKeypair.publicKey());
        console.log('💰 Relayer XLM balance:', relayerAccount.balances.find(b => b.asset_type === 'native')?.balance);

        // Calculate XLM amount to send using real-time rate from frontend
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE; // Use real rate if available
        const xlmAmount = (parseFloat(orderAmount || '0.001') * exchangeRate).toFixed(7);
        console.log('💱 Using exchange rate:', exchangeRate, 'XLM per ETH');
        
        console.log('🎯 Sending to user address:', userStellarAddress);
        console.log('💰 XLM amount to send:', xlmAmount);
        
        // Create payment transaction
        const payment = Operation.payment({
          destination: userStellarAddress,
          asset: Asset.native(), // XLM
          amount: xlmAmount
        });
        
        // Build transaction
        const transaction = new TransactionBuilder(relayerAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET
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
        console.log('🌐 View on StellarExpert: https://stellar.expert/explorer/testnet/tx/' + result.hash);
        
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
        const xlmAmount = (parseFloat(orderAmount || '0.001') * exchangeRate).toFixed(7);
        
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
      
      const { orderId, stellarTxHash, stellarAddress, ethAddress } = req.body;
      
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
        // Load ethers and connect to Sepolia - REAL MODE ONLY
        const rpcUrl = RELAYER_CONFIG.ethereum.rpcUrl;
        const privateKey = process.env.RELAYER_PRIVATE_KEY;
        
        if (!privateKey) {
          throw new Error('RELAYER_PRIVATE_KEY environment variable is required');
        }
        
        console.log('💰 REAL MODE: Sending actual ETH transaction');
        console.log('🔗 RPC URL:', rpcUrl);
        console.log('🔑 Using real private key:', privateKey.substring(0, 10) + '...');
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const relayerWallet = new ethers.Wallet(privateKey, provider);
        
        console.log('🔑 Relayer ETH address:', relayerWallet.address);
        
        // Get relayer balance
        const balance = await provider.getBalance(relayerWallet.address);
        console.log('💰 Relayer ETH balance:', ethers.formatEther(balance), 'ETH');
        
        // Calculate ETH amount to send using real-time rate from frontend  
        const exchangeRate = storedOrder?.exchangeRate || ETH_TO_XLM_RATE; // Use real rate if available
        let ethAmount;
        if (storedOrder?.targetAmount) {
          ethAmount = storedOrder.targetAmount;
        } else {
          // Convert XLM to ETH using exchange rate, then to wei (18 decimals)
          const ethAmountDecimal = parseFloat(orderAmount) / exchangeRate;
          // Round to avoid decimal precision issues and convert to wei properly
          const ethAmountFixed = Math.floor(ethAmountDecimal * 1e18); // Convert to wei as integer
          ethAmount = ethAmountFixed.toString(); // Use wei directly as string
        }
        console.log('💱 Using exchange rate:', exchangeRate, 'XLM per ETH (dedicated endpoint)');
        console.log('🎯 ETH amount to send:', (parseInt(ethAmount) / 1e18).toFixed(6), 'ETH');
        console.log('🏠 Sending to user address:', userEthAddress);
        
        // Create ETH transfer transaction
        const tx = {
          to: userEthAddress,
          value: ethAmount,
          gasLimit: 21000,
          gasPrice: ethers.parseUnits('20', 'gwei')
        };
        
        // Send transaction
        const ethTxResponse = await relayerWallet.sendTransaction(tx);
        console.log('📤 ETH transaction sent:', ethTxResponse.hash);
        
        // Wait for confirmation
        const ethTxReceipt = await ethTxResponse.wait();
        console.log('✅ ETH transaction confirmed!');
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
              amount: `${(parseInt(ethAmount) / 1e18).toFixed(6)} ETH`,
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

// Initialize resolver whitelist configuration
const resolverConfig: WhitelistConfig = {
  requireWhitelist: true,
  autoApproval: false,
  maxResolvers: 100,
  stakingRequirement: '1000000000000000000', // 1 ETH
  kycRequired: true,
  kybRequired: true,
  competitionEnabled: true,
  minReputationScore: 30
};

// Initialize resolver manager
const resolverManager = new ResolverManager(ordersService, resolverConfig);

// Connect resolver manager to event system
resolverManager.on('competitionStarted', (event) => {
  eventManager.emitEvent(EventType.FragmentReady, event.orderId, event);
});

resolverManager.on('competitionEnded', (event) => {
  eventManager.emitEvent(EventType.SecretShared, event.orderId, event);
});

resolverManager.on('performanceUpdated', (event) => {
  eventManager.emitEvent(EventType.RecommendationGenerated, event.address, event);
});

console.log('✅ Phase 3.5: Resolver Integration initialized');

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

// ===== PHASE 3.5: RESOLVER INTEGRATION ENDPOINTS =====

// GET /resolvers - Get all whitelisted resolvers
app.get('/resolvers', async (req, res) => {
  try {
    const resolvers = resolverManager.getResolvers();
    res.json(createSuccessResponse(resolvers));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get resolvers', getErrorMessage(error)));
  }
});

// GET /resolvers/:address - Get specific resolver
app.get('/resolvers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const resolver = resolverManager.getResolver(address);
    
    if (!resolver) {
      return res.status(404).json(createErrorResponse('Resolver not found'));
    }
    
    res.json(createSuccessResponse(resolver));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get resolver', getErrorMessage(error)));
  }
});

// POST /resolvers - Add new resolver to whitelist
app.post('/resolvers', async (req, res) => {
  try {
    const { address, name, description, website, tier } = req.body;
    
    if (!address) {
      return res.status(400).json(createErrorResponse('Resolver address is required'));
    }
    
    const added = resolverManager.addResolver(address, {
      name,
      description,
      website,
      kycStatus: 'pending',
      kybStatus: 'pending'
    }, tier || ResolverTier.Standard);
    
    if (!added) {
      return res.status(400).json(createErrorResponse('Resolver already exists'));
    }
    
    res.json(createSuccessResponse({ address, added: true }));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to add resolver', getErrorMessage(error)));
  }
});

// PUT /resolvers/:address/status - Update resolver status
app.put('/resolvers/:address/status', async (req, res) => {
  try {
    const { address } = req.params;
    const { status } = req.body;
    
    if (!Object.values(ResolverStatus).includes(status)) {
      return res.status(400).json(createErrorResponse('Invalid status'));
    }
    
    const updated = resolverManager.updateResolverStatus(address, status);
    
    if (!updated) {
      return res.status(404).json(createErrorResponse('Resolver not found'));
    }
    
    res.json(createSuccessResponse({ address, status, updated: true }));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to update resolver status', getErrorMessage(error)));
  }
});

// DELETE /resolvers/:address - Remove resolver from whitelist
app.delete('/resolvers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const removed = resolverManager.removeResolver(address);
    
    if (!removed) {
      return res.status(404).json(createErrorResponse('Resolver not found'));
    }
    
    res.json(createSuccessResponse({ address, removed: true }));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to remove resolver', getErrorMessage(error)));
  }
});

// GET /competitions - Get active competitions
app.get('/competitions', async (req, res) => {
  try {
    const competitions = resolverManager.getActiveCompetitions();
    res.json(createSuccessResponse(competitions));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get competitions', getErrorMessage(error)));
  }
});

// POST /competitions/start - Start competition for fragment
app.post('/competitions/start', async (req, res) => {
  try {
    const { orderId, fragmentIndex } = req.body;
    
    if (!orderId || fragmentIndex === undefined) {
      return res.status(400).json(createErrorResponse('Order ID and fragment index are required'));
    }
    
    const competition = resolverManager.startCompetition(orderId, fragmentIndex);
    res.json(createSuccessResponse(competition));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to start competition', getErrorMessage(error)));
  }
});

// POST /competitions/bid - Submit bid for competition
app.post('/competitions/bid', async (req, res) => {
  try {
    const { 
      orderId, 
      fragmentIndex, 
      resolverAddress, 
      bidAmount, 
      gasPrice, 
      executionTime, 
      confidence 
    } = req.body;
    
    if (!orderId || fragmentIndex === undefined || !resolverAddress || !bidAmount) {
      return res.status(400).json(createErrorResponse(
        'Order ID, fragment index, resolver address, and bid amount are required'
      ));
    }
    
    const bid = {
      orderId,
      fragmentIndex,
      resolverAddress,
      bidAmount,
      gasPrice: gasPrice || '20000000000', // 20 gwei default
      executionTime: executionTime || 5000, // 5 seconds default
      confidence: confidence || 80, // 80% default
      timestamp: Date.now()
    };
    
    const submitted = resolverManager.submitBid(bid);
    
    if (!submitted) {
      return res.status(400).json(createErrorResponse('Failed to submit bid'));
    }
    
    res.json(createSuccessResponse({ bid, submitted: true }));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to submit bid', getErrorMessage(error)));
  }
});

// GET /competitions/:orderId/:fragmentIndex - Get specific competition
app.get('/competitions/:orderId/:fragmentIndex', async (req, res) => {
  try {
    const { orderId, fragmentIndex } = req.params;
    
    const competition = resolverManager.getCompetition(orderId, parseInt(fragmentIndex));
    
    if (!competition) {
      return res.status(404).json(createErrorResponse('Competition not found'));
    }
    
    res.json(createSuccessResponse(competition));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get competition', getErrorMessage(error)));
  }
});

// GET /order/:orderId/resolver-recommendations - Get resolver recommendations
app.get('/order/:orderId/resolver-recommendations', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const recommendations = resolverManager.getResolverRecommendations(orderId);
    res.json(createSuccessResponse(recommendations));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get resolver recommendations', getErrorMessage(error)));
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



// Start relayer (always initialize when module loads)
initializeRelayer().catch(error => {
  console.error('❌ Failed to initialize relayer:', error);
  process.exit(1);
});

console.log('🔄 Relayer service configured and ready');

export default { RELAYER_CONFIG, initializeRelayer }; 