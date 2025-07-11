/**
 * @fileoverview Stellar blockchain operations for FusionBridge
 * @description Handles Stellar network interactions, claimable balances, and HTLC operations
 */

// Main exports
export { default as StellarClient, default } from './stellar-client';
export { StellarHTLCManager } from './claimable-balance';

// Types and interfaces
export type {
  StellarConfig,
  HTLCClaimableBalanceParams,
  ClaimableBalanceInfo,
  ClaimParams,
  RefundParams,
} from './claimable-balance';

export type {
  CrossChainOrder,
  StellarBridgeResult,
} from './stellar-client';

// Utility functions
export {
  createTestnetConfig,
  createMainnetConfig,
  generatePreimageAndHash,
  verifyPreimage,
} from './claimable-balance';

// Configuration constants
export const STELLAR_CONFIG = {
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    isTestnet: true,
  },
  mainnet: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    isTestnet: false,
  },
};

console.log('🌟 Stellar workspace initialized for FusionBridge'); 