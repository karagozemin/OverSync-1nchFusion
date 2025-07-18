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

// Load environment variables from root directory
config({ path: resolve(process.cwd(), '../.env') });
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

  // Start Ethereum event listener
  try {
    await ethereumListener.startListening();
  } catch (error) {
    console.error('❌ Failed to start Ethereum listener:', error);
    process.exit(1);
  }
  
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

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'FusionBridge Relayer'
  });
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

// ===== ORDERS API ENDPOINTS =====

// GET /order/active - Get active orders
app.get('/order/active', async (req, res) => {
  try {
    const { page, limit, srcChain, dstChain } = req.query as any;
    
    const result = ordersService.getActiveOrders(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      srcChain ? parseInt(srcChain) : undefined,
      dstChain ? parseInt(dstChain) : undefined
    );
    
    res.json(result);
    console.log(`📋 Active orders retrieved: ${result.items.length} items`);
  } catch (error) {
    console.error('❌ Failed to get active orders:', error);
    res.status(500).json(createErrorResponse('Failed to get active orders', getErrorMessage(error)));
  }
});

// GET /order/escrow - Get escrow factory
app.get('/order/escrow', async (req, res) => {
  try {
    const { chainId } = req.query as any;
    
    if (!chainId) {
      return res.status(400).json(createErrorResponse('chainId is required'));
    }

    const result = ordersService.getEscrowFactory(parseInt(chainId));
    res.json(result);
  } catch (error) {
    console.error('❌ Failed to get escrow factory:', error);
    res.status(500).json(createErrorResponse('Failed to get escrow factory', getErrorMessage(error)));
  }
});

// GET /order/maker/:address - Get orders by maker
app.get('/order/maker/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { page, limit } = req.query as any;
    
    const result = ordersService.getOrdersByMaker(
      address,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined
    );
    
    res.json(result);
    console.log(`📋 Orders by maker ${address}: ${result.items.length} items`);
  } catch (error) {
    console.error('❌ Failed to get orders by maker:', error);
    res.status(500).json(createErrorResponse('Failed to get orders by maker', getErrorMessage(error)));
  }
});

// GET /order/secrets/:orderHash - Get order secrets
app.get('/order/secrets/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getOrderSecrets(orderHash);
    
    if (!result) {
      return res.status(404).json(createErrorResponse('Order not found'));
    }
    
    res.json(result);
    console.log(`🔐 Secrets retrieved for order: ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get order secrets:', error);
    res.status(500).json(createErrorResponse('Failed to get order secrets', error.message));
  }
});

// GET /order/status/:orderHash - Get order status
app.get('/order/status/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getOrderStatus(orderHash);
    res.json(result);
    
    console.log(`📊 Status retrieved for order: ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get order status:', error);
    res.status(500).json(createErrorResponse('Failed to get order status', error.message));
  }
});

// POST /order/status - Get multiple order statuses
app.post('/order/status', async (req, res) => {
  try {
    const { orderHashes } = req.body;
    
    if (!Array.isArray(orderHashes)) {
      return res.status(400).json(createErrorResponse('orderHashes must be an array'));
    }
    
    const result = ordersService.getOrderStatuses(orderHashes);
    res.json(result);
    
    console.log(`📊 Multiple statuses retrieved for ${orderHashes.length} orders`);
  } catch (error) {
    console.error('❌ Failed to get order statuses:', error);
    res.status(500).json(createErrorResponse('Failed to get order statuses', error.message));
  }
});

// ===== RELAYER API ENDPOINTS =====

// POST /submit - Submit single order (renamed from /create-htlc)
app.post('/submit', async (req, res) => {
  try {
    const signedOrder = req.body as SignedOrderInput;
    
    // Validate required fields
    if (!signedOrder.order || !signedOrder.signature || !signedOrder.srcChainId) {
      return res.status(400).json(createErrorResponse('Missing required fields', 'order, signature, and srcChainId are required'));
    }

    // Add order to orders service
    const orderHash = ordersService.addOrder(signedOrder);
    
    res.json(createSuccessResponse({
      orderHash,
      message: 'Order submitted successfully'
    }));

    console.log('✅ Order submitted:', orderHash);
  } catch (error) {
    console.error('❌ Order submission failed:', error);
    res.status(500).json(createErrorResponse('Order submission failed', error.message));
  }
});

// POST /submit/many - Submit multiple orders
app.post('/submit/many', async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!Array.isArray(orders)) {
      return res.status(400).json(createErrorResponse('orders must be an array'));
    }

    const results = orders.map(order => {
      try {
        const orderHash = ordersService.addOrder(order);
        return { success: true, orderHash };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    });

    res.json({ results });
    console.log(`✅ Multiple orders submitted: ${results.filter(r => r.success).length}/${results.length} successful`);
  } catch (error) {
    console.error('❌ Multiple order submission failed:', error);
    res.status(500).json(createErrorResponse('Multiple order submission failed', error.message));
  }
});

// POST /submit/secret - Submit secret
app.post('/submit/secret', async (req, res) => {
  try {
    const secretInput = req.body as SecretInput;
    
    if (!secretInput.secret || !secretInput.orderHash) {
      return res.status(400).json(createErrorResponse('secret and orderHash are required'));
    }

    const result = ordersService.submitSecret(secretInput);
    
    res.json(createSuccessResponse({
      submitted: result,
      message: 'Secret submitted successfully'
    }));

    console.log('🔐 Secret submitted for order:', secretInput.orderHash);
  } catch (error) {
    console.error('❌ Secret submission failed:', error);
    res.status(500).json(createErrorResponse('Secret submission failed', error.message));
  }
});

// ===== PARTIAL FILLS API ENDPOINTS (1inch Fusion+ Compliant) =====

// GET /order/ready-to-accept-secret-fills/:orderHash - Get ready secrets for specific order
app.get('/order/ready-to-accept-secret-fills/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getReadyToAcceptSecretFills(orderHash);
    res.json(result);
    
    console.log(`📋 Ready to accept secret fills for order ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get ready secret fills:', error);
    res.status(500).json(createErrorResponse('Failed to get ready secret fills', getErrorMessage(error)));
  }
});

// GET /order/ready-to-accept-secret-fills - Get ready secrets for all orders
app.get('/order/ready-to-accept-secret-fills', async (req, res) => {
  try {
    const result = ordersService.getAllReadyToAcceptSecretFills();
    res.json(result);
    
    console.log('📋 Ready to accept secret fills for all orders retrieved');
  } catch (error) {
    console.error('❌ Failed to get ready secret fills:', error);
    res.status(500).json(createErrorResponse('Failed to get ready secret fills', getErrorMessage(error)));
  }
});

// GET /order/secrets/:orderHash - Get published secrets for order
app.get('/order/secrets/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getPublishedSecrets(orderHash);
    res.json(result);
    
    console.log(`🔐 Published secrets retrieved for order ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get published secrets:', error);
    res.status(500).json(createErrorResponse('Failed to get published secrets', getErrorMessage(error)));
  }
});

// GET /order/status/:orderHash - Get order status
app.get('/order/status/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getOrderStatus(orderHash);
    res.json(result);
    
    console.log(`📊 Order status retrieved for ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get order status:', error);
    res.status(500).json(createErrorResponse('Failed to get order status', getErrorMessage(error)));
  }
});

// POST /order/status - Get multiple order statuses
app.post('/order/status', async (req, res) => {
  try {
    const { orderHashes } = req.body;
    
    if (!Array.isArray(orderHashes)) {
      return res.status(400).json(createErrorResponse('orderHashes must be an array'));
    }
    
    const results = ordersService.getMultipleOrderStatuses(orderHashes);
    res.json(results);
    
    console.log(`📊 Multiple order statuses retrieved: ${orderHashes.length} orders`);
  } catch (error) {
    console.error('❌ Failed to get multiple order statuses:', error);
    res.status(500).json(createErrorResponse('Failed to get multiple order statuses', getErrorMessage(error)));
  }
});

// GET /order/ready-to-execute-public-actions - Get orders ready for public actions
app.get('/order/ready-to-execute-public-actions', async (req, res) => {
  try {
    const result = ordersService.getReadyToExecutePublicActions();
    res.json(result);
    
    console.log('🔓 Ready to execute public actions retrieved');
  } catch (error) {
    console.error('❌ Failed to get ready public actions:', error);
    res.status(500).json(createErrorResponse('Failed to get ready public actions', getErrorMessage(error)));
  }
});

// POST /submit/partial-fill - Submit partial fill execution
app.post('/submit/partial-fill', async (req, res) => {
  try {
    const { 
      orderHash, 
      fragmentIndex, 
      fillAmount, 
      resolver, 
      secretHash, 
      merkleProof 
    } = req.body;
    
    if (!orderHash || fragmentIndex === undefined || !fillAmount || !resolver || !secretHash || !merkleProof) {
      return res.status(400).json(createErrorResponse(
        'Missing required fields: orderHash, fragmentIndex, fillAmount, resolver, secretHash, merkleProof'
      ));
    }
    
    // Phase 3.5: Resolver validation
    if (!resolverManager.isResolverAllowed(resolver)) {
      return res.status(403).json(createErrorResponse('Resolver not whitelisted or inactive'));
    }
    
    const permissions = resolverManager.getResolverPermissions(resolver);
    if (!permissions || !permissions.canFillPartial) {
      return res.status(403).json(createErrorResponse('Resolver not authorized for partial fills'));
    }
    
    // Check fill amount limits
    if (permissions.maxFillAmount && BigInt(fillAmount) > BigInt(permissions.maxFillAmount)) {
      return res.status(400).json(createErrorResponse('Fill amount exceeds resolver limit'));
    }
    
    const result = ordersService.submitPartialFill({
      orderHash,
      fragmentIndex,
      fillAmount,
      resolver,
      secretHash,
      merkleProof
    });
    
    // Update resolver performance
    resolverManager.updateResolverPerformance(resolver, {
      fillId: result.fillId,
      orderId: orderHash,
      fragmentIndex,
      resolver,
      fillAmount,
      auctionPrice: '1000000000000000000', // Mock price
      gasCost: '100000000000000000', // Mock gas cost
      secretHash,
      merkleProof,
      status: 'executed',
      executedAt: Date.now()
    });
    
    res.json(createSuccessResponse(result));
    
    console.log(`🔄 Partial fill submitted for order ${orderHash}, fragment ${fragmentIndex} by resolver ${resolver}`);
  } catch (error) {
    console.error('❌ Partial fill submission failed:', error);
    res.status(500).json(createErrorResponse('Partial fill submission failed', getErrorMessage(error)));
  }
});

// GET /order/fragments/:orderHash - Get available order fragments
app.get('/order/fragments/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getOrderFragments(orderHash);
    res.json(result);
    
    console.log(`🧩 Order fragments retrieved for ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get order fragments:', error);
    res.status(500).json(createErrorResponse('Failed to get order fragments', getErrorMessage(error)));
  }
});

// GET /order/progress/:orderHash - Get order fill progress
app.get('/order/progress/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getOrderProgress(orderHash);
    res.json(result);
    
    console.log(`📈 Order progress retrieved for ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get order progress:', error);
    res.status(500).json(createErrorResponse('Failed to get order progress', getErrorMessage(error)));
  }
});

// GET /order/recommendations/:orderHash - Get fill recommendations
app.get('/order/recommendations/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const result = ordersService.getFillRecommendations(orderHash);
    res.json(result);
    
    console.log(`💡 Fill recommendations retrieved for ${orderHash}`);
  } catch (error) {
    console.error('❌ Failed to get fill recommendations:', error);
    res.status(500).json(createErrorResponse('Failed to get fill recommendations', getErrorMessage(error)));
  }
});

// ===== LEGACY ENDPOINT (for backward compatibility) =====

// GET /ready-to-accept-secret-fills - Legacy endpoint (redirects to new endpoint)
app.get('/ready-to-accept-secret-fills', async (req, res) => {
  try {
    const { orderHash } = req.query as any;
    
    if (orderHash) {
      // Redirect to specific order endpoint
      const result = ordersService.getReadyToAcceptSecretFills(orderHash);
      res.json(result);
    } else {
      // Redirect to all orders endpoint
      const result = ordersService.getAllReadyToAcceptSecretFills();
      res.json(result);
    }
    
    console.log('📋 Legacy ready to accept secret fills retrieved');
  } catch (error) {
    console.error('❌ Failed to get ready orders:', error);
    res.status(500).json(createErrorResponse('Failed to get ready orders', getErrorMessage(error)));
  }
});

// ===== PHASE 5: RECOVERY SYSTEM ENDPOINTS =====

// GET /recovery/stats - Get recovery statistics
app.get('/recovery/stats', async (req, res) => {
  try {
    const stats = recoveryService.getRecoveryStats();
    res.json(createSuccessResponse(stats));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get recovery stats', getErrorMessage(error)));
  }
});

// GET /recovery/requests - Get all recovery requests
app.get('/recovery/requests', async (req, res) => {
  try {
    const requests = recoveryService.getRecoveryRequests();
    res.json(createSuccessResponse(requests));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get recovery requests', getErrorMessage(error)));
  }
});

// GET /recovery/requests/:recoveryId - Get specific recovery request
app.get('/recovery/requests/:recoveryId', async (req, res) => {
  try {
    const { recoveryId } = req.params;
    const request = recoveryService.getRecoveryRequest(recoveryId);
    
    if (!request) {
      return res.status(404).json(createErrorResponse('Recovery request not found'));
    }
    
    res.json(createSuccessResponse(request));
  } catch (error) {
    res.status(500).json(createErrorResponse('Failed to get recovery request', getErrorMessage(error)));
  }
});

// POST /recovery/manual - Initiate manual recovery
app.post('/recovery/manual', async (req, res) => {
  try {
    const { orderHash, type, initiator, reason, metadata } = req.body;
    
    if (!orderHash || !type || !initiator || !reason) {
      return res.status(400).json(createErrorResponse('Missing required fields: orderHash, type, initiator, reason'));
    }
    
    // Validate recovery type
    if (!Object.values(RecoveryType).includes(type)) {
      return res.status(400).json(createErrorResponse(`Invalid recovery type: ${type}`));
    }
    
    const recoveryId = await recoveryService.initiateManualRecovery(
      orderHash,
      type,
      initiator,
      reason,
      metadata || {}
    );
    
    res.json(createSuccessResponse({ recoveryId }));
    
    console.log(`🔄 Manual recovery initiated: ${recoveryId} by ${initiator}`);
  } catch (error) {
    console.error('❌ Manual recovery failed:', error);
    res.status(500).json(createErrorResponse('Manual recovery failed', getErrorMessage(error)));
  }
});

// POST /recovery/emergency - Initiate emergency recovery
app.post('/recovery/emergency', async (req, res) => {
  try {
    const { orderHash, reason, initiator } = req.body;
    
    if (!orderHash || !reason || !initiator) {
      return res.status(400).json(createErrorResponse('Missing required fields: orderHash, reason, initiator'));
    }
    
    const recoveryId = await recoveryService.emergencyRecovery(orderHash, reason, initiator);
    
    res.json(createSuccessResponse({ recoveryId }));
    
    console.log(`🚨 Emergency recovery initiated: ${recoveryId} by ${initiator}`);
  } catch (error) {
    console.error('❌ Emergency recovery failed:', error);
    res.status(500).json(createErrorResponse('Emergency recovery failed', getErrorMessage(error)));
  }
});

// POST /recovery/test - Test recovery system (development only)
app.post('/recovery/test', async (req, res) => {
  try {
    const { orderHash, type } = req.body;
    
    if (!orderHash || !type) {
      return res.status(400).json(createErrorResponse('Missing required fields: orderHash, type'));
    }
    
    // Validate recovery type
    if (!Object.values(RecoveryType).includes(type)) {
      return res.status(400).json(createErrorResponse(`Invalid recovery type: ${type}`));
    }
    
    const recoveryId = await recoveryService.initiateManualRecovery(
      orderHash,
      type,
      'test-system',
      'Recovery system test',
      { test: true }
    );
    
    res.json(createSuccessResponse({ 
      recoveryId, 
      message: 'Test recovery initiated',
      type 
    }));
    
    console.log(`🧪 Test recovery initiated: ${recoveryId}`);
  } catch (error) {
    console.error('❌ Test recovery failed:', error);
    res.status(500).json(createErrorResponse('Test recovery failed', getErrorMessage(error)));
  }
});

// ===== LEGACY ENDPOINT (for backward compatibility) =====

// POST /create-htlc - Legacy endpoint (redirects to /submit)
app.post('/create-htlc', async (req, res) => {
  try {
    const { fromToken, toToken, amount, ethAddress, stellarAddress, timestamp } = req.body;

    console.log('🔄 Legacy bridge request received:', {
      from: `${fromToken.symbol} (${fromToken.chain})`,
      to: `${toToken.symbol} (${toToken.chain})`,
      amount: amount,
      ethAddress: ethAddress,
      stellarAddress: stellarAddress
    });

    // Validate request
    if (!fromToken || !toToken || !amount || !ethAddress || !stellarAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fromToken', 'toToken', 'amount', 'ethAddress', 'stellarAddress']
      });
    }

    // For now, return a success response
    // In a full implementation, this would initiate the actual bridge process
    const bridgeId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      bridgeId: bridgeId,
      transactionId: `tx_${Date.now()}`,
      message: 'Bridge request processed successfully',
      estimatedTime: '2-5 minutes'
    });

    // Log the bridge request
    console.log('✅ Bridge request processed:', bridgeId);

  } catch (error) {
    console.error('❌ Bridge request failed:', error);
    res.status(500).json({
      error: 'Bridge request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start relayer if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeRelayer().catch(error => {
    console.error('❌ Failed to initialize relayer:', error);
    process.exit(1);
  });
}

console.log('🔄 Relayer service configured and ready');

export default { RELAYER_CONFIG, initializeRelayer }; 