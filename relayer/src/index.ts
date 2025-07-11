/**
 * @fileoverview Relayer service for FusionBridge cross-chain operations
 * @description Monitors Ethereum events and coordinates Stellar transactions
 */

// Relayer configuration
export const RELAYER_CONFIG = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/your-key',
    contractAddress: process.env.HTLC_CONTRACT_ADDRESS || '',
  },
  stellar: {
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    secretKey: process.env.STELLAR_SECRET_KEY || '',
  },
};

console.log('🔄 Relayer service initialized for FusionBridge'); 