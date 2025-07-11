/**
 * @fileoverview Main Stellar Client for FusionBridge
 * @description Integrates HTLC claimable balance functionality with relayer interface
 */

import {
  StellarHTLCManager,
  StellarConfig,
  HTLCClaimableBalanceParams,
  ClaimParams,
  RefundParams,
  ClaimableBalanceInfo,
  createTestnetConfig,
  createMainnetConfig,
  generatePreimageAndHash,
  verifyPreimage,
} from './claimable-balance';

/**
 * Cross-chain order data from Ethereum
 */
export interface CrossChainOrder {
  ethereumOrderId: number;
  ethereumTxHash: string;
  token: string;
  amount: string;
  hashLock: string;
  timelock: number;
  sender: string;
  recipient: string;
}

/**
 * Stellar bridge transaction result
 */
export interface StellarBridgeResult {
  success: boolean;
  txHash?: string;
  balanceId?: string;
  error?: string;
}

/**
 * Main Stellar client for FusionBridge cross-chain operations
 */
export default class StellarClient {
  private htlcManager: StellarHTLCManager;
  private config: StellarConfig;

  constructor(isTestnet: boolean = true) {
    this.config = isTestnet ? createTestnetConfig() : createMainnetConfig();
    this.htlcManager = new StellarHTLCManager(this.config);
  }

  /**
   * Create HTLC claimable balance in response to Ethereum order
   * @param order Cross-chain order from Ethereum
   * @param relayerSecretKey Relayer's Stellar secret key
   * @returns Bridge transaction result
   */
  async createHTLCFromEthereumOrder(
    order: CrossChainOrder,
    relayerSecretKey: string
  ): Promise<StellarBridgeResult> {
    try {
      console.log(`🌉 Creating Stellar HTLC for Ethereum order ${order.ethereumOrderId}`);

      const params: HTLCClaimableBalanceParams = {
        sourceSecretKey: relayerSecretKey,
        recipientPublicKey: order.recipient,
        assetCode: this.mapEthereumTokenToStellar(order.token),
        amount: order.amount,
        hashLock: order.hashLock,
        timelock: order.timelock,
        memo: `ETH-${order.ethereumOrderId}`,
      };

      const result = await this.htlcManager.createClaimableBalance(params);

      console.log(`✅ Stellar HTLC created for Ethereum order ${order.ethereumOrderId}`);
      console.log(`🆔 Claimable Balance ID: ${result.balanceId}`);

      return {
        success: true,
        txHash: result.txHash,
        balanceId: result.balanceId,
      };
    } catch (error) {
      console.error(`❌ Failed to create Stellar HTLC:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claim Stellar claimable balance with preimage
   * @param balanceId Claimable balance ID
   * @param preimage Secret preimage
   * @param claimerSecretKey Claimer's secret key
   * @returns Bridge transaction result
   */
  async claimStellarHTLC(
    balanceId: string,
    preimage: string,
    claimerSecretKey: string
  ): Promise<StellarBridgeResult> {
    try {
      console.log(`🔑 Claiming Stellar HTLC: ${balanceId}`);

      const claimParams: ClaimParams = {
        claimerSecretKey,
        balanceId,
        preimage,
      };

      const txHash = await this.htlcManager.claimWithPreimage(claimParams);

      console.log(`✅ Stellar HTLC claimed successfully`);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      console.error(`❌ Failed to claim Stellar HTLC:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refund expired Stellar claimable balance
   * @param balanceId Claimable balance ID
   * @param refunderSecretKey Refunder's secret key
   * @returns Bridge transaction result
   */
  async refundStellarHTLC(
    balanceId: string,
    refunderSecretKey: string
  ): Promise<StellarBridgeResult> {
    try {
      console.log(`🔄 Refunding expired Stellar HTLC: ${balanceId}`);

      const refundParams: RefundParams = {
        refunderSecretKey,
        balanceId,
      };

      const txHash = await this.htlcManager.refundExpired(refundParams);

      console.log(`✅ Stellar HTLC refunded successfully`);

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      console.error(`❌ Failed to refund Stellar HTLC:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get claimable balance information
   * @param balanceId Claimable balance ID
   * @returns Balance information or null if not found
   */
  async getClaimableBalanceInfo(balanceId: string): Promise<ClaimableBalanceInfo | null> {
    try {
      return await this.htlcManager.getClaimableBalanceInfo(balanceId);
    } catch (error) {
      console.error(`❌ Failed to get balance info:`, error);
      return null;
    }
  }

  /**
   * List all claimable balances for an account
   * @param accountId Stellar account public key
   * @returns Array of claimable balances
   */
  async getAccountClaimableBalances(accountId: string): Promise<ClaimableBalanceInfo[]> {
    try {
      return await this.htlcManager.getClaimableBalances(accountId);
    } catch (error) {
      console.error(`❌ Failed to get account balances:`, error);
      return [];
    }
  }

  /**
   * Generate preimage and hash for new HTLC
   * @returns Preimage and corresponding hash
   */
  generateSecret(): { preimage: string; hash: string } {
    return generatePreimageAndHash();
  }

  /**
   * Verify that preimage matches expected hash
   * @param preimage Secret preimage
   * @param expectedHash Expected hash value
   * @returns Whether preimage is valid
   */
  verifySecret(preimage: string, expectedHash: string): boolean {
    return verifyPreimage(preimage, expectedHash);
  }

  /**
   * Get network configuration
   * @returns Current Stellar network config
   */
  getNetworkConfig(): StellarConfig {
    return this.config;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS  
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Map Ethereum token address to Stellar asset
   * @param ethereumToken Ethereum token contract address
   * @returns Stellar asset code
   */
  private mapEthereumTokenToStellar(ethereumToken: string): string {
    // TODO: Implement proper token mapping
    // For now, simplified mapping for development
    const tokenMap: Record<string, string> = {
      '0xA0b86a33E6417C4fd30ad9D05D6b9b7cd6dd11B': 'USDC', // Example USDC address
      '0x0000000000000000000000000000000000000000': 'XLM',  // ETH → XLM mapping
      // Add more token mappings as needed
    };

    return tokenMap[ethereumToken.toLowerCase()] || 'XLM';
  }
}

// Export utilities for external use
export {
  StellarHTLCManager,
  createTestnetConfig,
  createMainnetConfig,
  generatePreimageAndHash,
  verifyPreimage,
}; 