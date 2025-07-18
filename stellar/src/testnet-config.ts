/**
 * @fileoverview Stellar Testnet Configuration for Phase 6.2
 * @description Configuration for Stellar testnet integration with Ethereum Sepolia
 */

import { Networks } from '@stellar/stellar-sdk';
import { EnhancedBridgeConfig } from './enhanced-stellar-bridge.js';

/**
 * Stellar Testnet Configuration
 */
export const STELLAR_TESTNET_CONFIG = {
  networkPassphrase: Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org',
  isTestnet: true,
  
  // Known testnet assets
  assets: {
    XLM: {
      code: 'XLM',
      issuer: undefined // Native asset
    },
    USDC: {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' // Testnet USDC
    },
    FTEST: {
      code: 'FTEST',
      issuer: 'GDJVFDG5OCW5PYWHB64MGDHKCYQPJMZPFQWATP2DJLRBJBGHZNTT3L6V' // Our test token
    }
  },
  
  // Testnet settings
  settings: {
    baseFee: '100',
    timeout: 30,
    maxRetries: 3,
    confirmationBlocks: 1
  }
};

/**
 * Ethereum Sepolia Configuration
 */
export const ETHEREUM_SEPOLIA_CONFIG = {
  chainId: 11155111,
  networkName: 'sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/your-project-id',
  
  // Contract addresses (to be updated after deployment)
  contracts: {
    HTLCBridge: '0x0000000000000000000000000000000000000000', // Update after deployment
    EscrowFactory: '0x0000000000000000000000000000000000000000', // Update after deployment
    TestToken: '0x0000000000000000000000000000000000000000' // Update after deployment
  },
  
  // Gas settings
  gas: {
    limit: 5000000,
    price: '20000000000', // 20 gwei
    maxFeePerGas: '30000000000', // 30 gwei
    maxPriorityFeePerGas: '2000000000' // 2 gwei
  },
  
  // Block confirmations
  confirmations: 2,
  
  // Explorer
  explorer: 'https://sepolia.etherscan.io'
};

/**
 * Phase 6.2 Bridge Configuration
 */
export const PHASE6_BRIDGE_CONFIG: EnhancedBridgeConfig = {
  // Stellar configuration
  networkPassphrase: STELLAR_TESTNET_CONFIG.networkPassphrase,
  horizonUrl: STELLAR_TESTNET_CONFIG.horizonUrl,
  isTestnet: STELLAR_TESTNET_CONFIG.isTestnet,
  
  // Ethereum configuration
  ethereumRpcUrl: ETHEREUM_SEPOLIA_CONFIG.rpcUrl,
  htlcBridgeAddress: ETHEREUM_SEPOLIA_CONFIG.contracts.HTLCBridge,
  escrowFactoryAddress: ETHEREUM_SEPOLIA_CONFIG.contracts.EscrowFactory,
  
  // Relayer configuration
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '',
  defaultGasLimit: ETHEREUM_SEPOLIA_CONFIG.gas.limit,
  defaultGasPrice: ETHEREUM_SEPOLIA_CONFIG.gas.price
};

/**
 * Cross-chain pair configurations
 */
export const CROSS_CHAIN_PAIRS = [
  {
    name: 'ETH-XLM',
    ethereum: {
      token: '0x0000000000000000000000000000000000000000', // ETH (native)
      symbol: 'ETH',
      decimals: 18
    },
    stellar: {
      asset: STELLAR_TESTNET_CONFIG.assets.XLM,
      symbol: 'XLM',
      decimals: 7
    },
    minAmount: '0.001',
    maxAmount: '10',
    feeRate: 100 // 1%
  },
  {
    name: 'FTEST-USDC',
    ethereum: {
      token: ETHEREUM_SEPOLIA_CONFIG.contracts.TestToken,
      symbol: 'FTEST',
      decimals: 18
    },
    stellar: {
      asset: STELLAR_TESTNET_CONFIG.assets.USDC,
      symbol: 'USDC',
      decimals: 6
    },
    minAmount: '1',
    maxAmount: '10000',
    feeRate: 50 // 0.5%
  }
];

/**
 * Safety deposit configuration
 */
export const SAFETY_DEPOSIT_CONFIG = {
  minDeposit: '0.001', // 0.001 ETH
  maxDeposit: '5', // 5 ETH
  defaultDeposit: '0.01', // 0.01 ETH
  
  // Deposit based on order value
  percentageBased: {
    enabled: true,
    minPercentage: 0.1, // 0.1%
    maxPercentage: 5, // 5%
    defaultPercentage: 1 // 1%
  }
};

/**
 * Timelock configuration
 */
export const TIMELOCK_CONFIG = {
  minTimelock: 3600, // 1 hour
  maxTimelock: 604800, // 7 days
  defaultTimelock: 86400, // 24 hours
  
  // Grace period for claims
  gracePeriod: 1800, // 30 minutes
  
  // Monitoring intervals
  monitoringInterval: 300, // 5 minutes
  expirationCheckInterval: 600 // 10 minutes
};

/**
 * Fee configuration
 */
export const FEE_CONFIG = {
  bridgeFee: 10, // 0.1% in basis points
  factoryFee: 10, // 0.1% in basis points
  gasFeeBuffer: 20, // 20% buffer for gas fees
  
  // Dynamic fee adjustments
  dynamicFees: {
    enabled: true,
    baseMultiplier: 1.0,
    congestionMultiplier: 2.0,
    volumeDiscountThreshold: '100000' // $100k equivalent
  }
};

/**
 * Monitoring and alerting configuration
 */
export const MONITORING_CONFIG = {
  healthCheck: {
    interval: 30000, // 30 seconds
    timeout: 10000, // 10 seconds
    retries: 3
  },
  
  alerts: {
    enabled: true,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL
  },
  
  metrics: {
    enabled: true,
    port: 9090,
    path: '/metrics'
  }
};

/**
 * Development helpers
 */
export const DEV_CONFIG = {
  // Test accounts (DO NOT USE IN PRODUCTION)
  testAccounts: {
    ethereum: {
      privateKey: process.env.TEST_ETHEREUM_PRIVATE_KEY || '',
      address: process.env.TEST_ETHEREUM_ADDRESS || ''
    },
    stellar: {
      secretKey: process.env.TEST_STELLAR_SECRET_KEY || '',
      publicKey: process.env.TEST_STELLAR_PUBLIC_KEY || ''
    }
  },
  
  // Faucet URLs
  faucets: {
    ethereum: 'https://sepoliafaucet.com/',
    stellar: 'https://friendbot.stellar.org'
  },
  
  // Test scenarios
  testScenarios: {
    smallOrder: {
      ethereumAmount: '0.01',
      stellarAmount: '10',
      safetyDeposit: '0.001'
    },
    mediumOrder: {
      ethereumAmount: '0.1',
      stellarAmount: '100',
      safetyDeposit: '0.01'
    },
    largeOrder: {
      ethereumAmount: '1',
      stellarAmount: '1000',
      safetyDeposit: '0.1'
    }
  }
};

/**
 * Export all configurations
 */
export const PHASE6_CONFIG = {
  stellar: STELLAR_TESTNET_CONFIG,
  ethereum: ETHEREUM_SEPOLIA_CONFIG,
  bridge: PHASE6_BRIDGE_CONFIG,
  pairs: CROSS_CHAIN_PAIRS,
  safetyDeposit: SAFETY_DEPOSIT_CONFIG,
  timelock: TIMELOCK_CONFIG,
  fees: FEE_CONFIG,
  monitoring: MONITORING_CONFIG,
  dev: DEV_CONFIG
};

/**
 * Validation functions
 */
export function validateConfig(): boolean {
  // Check required environment variables
  const requiredEnvVars = [
    'RELAYER_PRIVATE_KEY',
    'TEST_ETHEREUM_PRIVATE_KEY',
    'TEST_STELLAR_SECRET_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      return false;
    }
  }
  
  // Check contract addresses
  if (ETHEREUM_SEPOLIA_CONFIG.contracts.HTLCBridge === '0x0000000000000000000000000000000000000000') {
    console.warn('⚠️  HTLCBridge address not configured');
  }
  
  if (ETHEREUM_SEPOLIA_CONFIG.contracts.EscrowFactory === '0x0000000000000000000000000000000000000000') {
    console.warn('⚠️  EscrowFactory address not configured');
  }
  
  console.log('✅ Configuration validation passed');
  return true;
}

/**
 * Update contract addresses after deployment
 */
export function updateContractAddresses(addresses: {
  htlcBridge: string;
  escrowFactory: string;
  testToken: string;
}): void {
  ETHEREUM_SEPOLIA_CONFIG.contracts.HTLCBridge = addresses.htlcBridge;
  ETHEREUM_SEPOLIA_CONFIG.contracts.EscrowFactory = addresses.escrowFactory;
  ETHEREUM_SEPOLIA_CONFIG.contracts.TestToken = addresses.testToken;
  
  // Update bridge config
  PHASE6_BRIDGE_CONFIG.htlcBridgeAddress = addresses.htlcBridge;
  PHASE6_BRIDGE_CONFIG.escrowFactoryAddress = addresses.escrowFactory;
  
  // Update cross-chain pairs
  CROSS_CHAIN_PAIRS[1].ethereum.token = addresses.testToken;
  
  console.log('✅ Contract addresses updated');
} 