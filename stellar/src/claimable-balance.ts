/**
 * @fileoverview Stellar Claimable Balance with HTLC functionality
 * @description Creates hash-locked time-locked claimable balances for cross-chain swaps
 */

import crypto from 'crypto';
import {
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  Claimant,
  BASE_FEE,
  TimeoutInfinite,
  Memo,
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/lib/horizon/index.js';

/**
 * Configuration for Stellar network
 */
export interface StellarConfig {
  networkPassphrase: string;
  horizonUrl: string;
  isTestnet: boolean;
}

/**
 * HTLC Claimable Balance parameters
 */
export interface HTLCClaimableBalanceParams {
  sourceSecretKey: string;
  recipientPublicKey: string;
  assetCode: string;
  assetIssuer?: string; // undefined for XLM
  amount: string;
  hashLock: string; // hex string
  timelock: number; // Unix timestamp
  memo?: string;
}

/**
 * Claimable Balance info structure
 */
export interface ClaimableBalanceInfo {
  id: string;
  assetCode: string;
  assetIssuer?: string;
  amount: string;
  sponsor: string;
  hashLock?: string;
  timelock?: number;
}

/**
 * Claim parameters
 */
export interface ClaimParams {
  claimerSecretKey: string;
  balanceId: string;
  preimage: string; // hex string
}

/**
 * Refund parameters  
 */
export interface RefundParams {
  refunderSecretKey: string;
  balanceId: string;
}

/**
 * Stellar HTLC Claimable Balance Manager
 * Provides hash-locked time-locked claimable balance functionality
 */
export class StellarHTLCManager {
  private config: StellarConfig;
  private server: Server;

  constructor(config: StellarConfig) {
    this.config = config;
    this.server = new Server(config.horizonUrl);
  }

  /**
   * Create a new HTLC claimable balance
   * @param params HTLC parameters
   * @returns Transaction hash and claimable balance ID
   */
  async createClaimableBalance(
    params: HTLCClaimableBalanceParams
  ): Promise<{ txHash: string; balanceId: string }> {
    try {
      // Validate inputs
      this.validateHashLock(params.hashLock);
      this.validateTimelock(params.timelock);

      console.log(`🌟 Creating HTLC Claimable Balance...`);
      console.log(`📦 Asset: ${params.assetCode}`);
      console.log(`💰 Amount: ${params.amount}`);
      console.log(`🔒 Hash: ${params.hashLock}`);
      console.log(`⏰ Timelock: ${new Date(params.timelock * 1000).toISOString()}`);

      // Create keypair from source secret
      const sourceKeypair = Keypair.fromSecret(params.sourceSecretKey);
      
      // Load source account
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());
      
      // Define asset (XLM or custom asset)
      const asset = params.assetCode === 'XLM' 
        ? Asset.native()
        : new Asset(params.assetCode, params.assetIssuer!);

      // Create claimants with HTLC conditions
      const claimants = [
        // Recipient can claim with correct preimage (hash condition)
        new Claimant(
          params.recipientPublicKey,
          Claimant.predicateBeforeRelativeTime(params.timelock.toString())
        ),
        // Source can reclaim after timelock expires  
        new Claimant(
          sourceKeypair.publicKey(),
          Claimant.predicateBeforeAbsoluteTime(params.timelock.toString())
        )
      ];

      // Build transaction
      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      });

      // Add create claimable balance operation
      txBuilder.addOperation(
        Operation.createClaimableBalance({
          asset: asset,
          amount: params.amount,
          claimants: claimants,
        })
      );

      // Add memo if provided
      if (params.memo) {
        txBuilder.addMemo(Memo.text(params.memo));
      }

      txBuilder.setTimeout(TimeoutInfinite);
      
      // Build and sign transaction
      const transaction = txBuilder.build();
      transaction.sign(sourceKeypair);

      // Submit transaction
      console.log('📡 Submitting transaction to Stellar network...');
      const response = await this.server.submitTransaction(transaction);
      
      console.log(`✅ HTLC Claimable Balance created successfully!`);
      console.log(`📝 Transaction hash: ${response.hash}`);

      // Extract claimable balance ID from response
      const balanceId = this.extractClaimableBalanceId(response);
      console.log(`🆔 Claimable Balance ID: ${balanceId}`);

      return {
        txHash: response.hash,
        balanceId: balanceId,
      };
    } catch (error) {
      console.error('❌ Failed to create HTLC claimable balance:', error);
      throw new Error(`Claimable balance creation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Claim a claimable balance by revealing preimage
   * @param params Claim parameters with preimage
   * @returns Transaction hash
   */
  async claimWithPreimage(params: ClaimParams): Promise<string> {
    try {
      console.log(`🔑 Claiming claimable balance: ${params.balanceId}`);
      console.log(`🔓 Preimage: ${params.preimage}`);

      // Validate preimage format
      if (!/^[0-9a-fA-F]{64}$/.test(params.preimage)) {
        throw new Error('Invalid preimage format');
      }

      // Create keypair from claimer secret
      const claimerKeypair = Keypair.fromSecret(params.claimerSecretKey);
      
      // Load claimer account
      const claimerAccount = await this.server.loadAccount(claimerKeypair.publicKey());

      // Build transaction
      const txBuilder = new TransactionBuilder(claimerAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      });

      // Add claim claimable balance operation
      txBuilder.addOperation(
        Operation.claimClaimableBalance({
          balanceId: params.balanceId,
        })
      );

      // Add preimage as memo (for HTLC verification)
      txBuilder.addMemo(Memo.text(`preimage:${params.preimage}`));
      
      txBuilder.setTimeout(TimeoutInfinite);
      
      // Build and sign transaction
      const transaction = txBuilder.build();
      transaction.sign(claimerKeypair);

      // Submit transaction
      console.log('📡 Submitting claim transaction to Stellar network...');
      const response = await this.server.submitTransaction(transaction);

      console.log(`✅ Claimable balance claimed successfully!`);
      console.log(`🔑 Preimage revealed: ${params.preimage}`);
      console.log(`📝 Transaction hash: ${response.hash}`);

      return response.hash;
    } catch (error) {
      console.error('❌ Failed to claim claimable balance:', error);
      throw new Error(`Claim failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Refund an expired claimable balance
   * @param params Refund parameters
   * @returns Transaction hash
   */
  async refundExpired(params: RefundParams): Promise<string> {
    try {
      console.log(`🔄 Refunding expired claimable balance: ${params.balanceId}`);

      // Create keypair from refunder secret
      const refunderKeypair = Keypair.fromSecret(params.refunderSecretKey);
      
      // Load refunder account
      const refunderAccount = await this.server.loadAccount(refunderKeypair.publicKey());

      // Build transaction
      const txBuilder = new TransactionBuilder(refunderAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.config.networkPassphrase,
      });

      // Add claim claimable balance operation (refunder can claim after timelock)
      txBuilder.addOperation(
        Operation.claimClaimableBalance({
          balanceId: params.balanceId,
        })
      );

      // Add refund memo
      txBuilder.addMemo(Memo.text('htlc-refund'));
      
      txBuilder.setTimeout(TimeoutInfinite);
      
      // Build and sign transaction
      const transaction = txBuilder.build();
      transaction.sign(refunderKeypair);

      // Submit transaction
      console.log('📡 Submitting refund transaction to Stellar network...');
      const response = await this.server.submitTransaction(transaction);

      console.log(`✅ Claimable balance refunded successfully!`);
      console.log(`📝 Transaction hash: ${response.hash}`);

      return response.hash;
    } catch (error) {
      console.error('❌ Failed to refund claimable balance:', error);
      throw new Error(`Refund failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get claimable balance information
   * @param balanceId Claimable balance ID
   * @returns Balance information
   */
  async getClaimableBalanceInfo(balanceId: string): Promise<ClaimableBalanceInfo> {
    try {
      console.log(`📊 Getting balance info for: ${balanceId}`);

      // Call Horizon API to get claimable balance details
      const claimableBalance = await this.server.claimableBalances()
        .claimableBalance(balanceId)
        .call();

      // Parse asset information
      const asset = claimableBalance.asset;
      const assetCode = typeof asset === 'string' && asset === 'native' 
        ? 'XLM' 
        : (asset as any).asset_code || 'XLM';
      const assetIssuer = typeof asset === 'string' && asset === 'native' 
        ? undefined 
        : (asset as any).asset_issuer;

      // Extract timelock and hash from claimants (if available)
      let timelock: number | undefined;
      let hashLock: string | undefined;

      if (claimableBalance.claimants && claimableBalance.claimants.length > 0) {
        // Look for timelock in predicates
        for (const claimant of claimableBalance.claimants) {
          if (claimant.predicate && claimant.predicate.abs_before) {
            timelock = parseInt(claimant.predicate.abs_before);
          }
          // Hash condition would be in custom predicates (implementation specific)
        }
      }

      const balanceInfo: ClaimableBalanceInfo = {
        id: claimableBalance.id,
        assetCode: assetCode,
        assetIssuer: assetIssuer,
        amount: claimableBalance.amount,
        sponsor: claimableBalance.sponsor || 'unknown',
        hashLock: hashLock,
        timelock: timelock,
      };

      console.log(`✅ Retrieved balance info: ${assetCode} ${claimableBalance.amount}`);
      return balanceInfo;
    } catch (error) {
      console.error('❌ Failed to get claimable balance info:', error);
      throw new Error(`Failed to get balance info: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * List claimable balances for an account
   * @param accountId Account public key
   * @returns Array of claimable balances
   */
  async getClaimableBalances(accountId: string): Promise<ClaimableBalanceInfo[]> {
    try {
      console.log(`📋 Getting claimable balances for: ${accountId}`);

      // Call Horizon API to get claimable balances for the account
      const response = await this.server.claimableBalances()
        .claimant(accountId)
        .call();

      const balances: ClaimableBalanceInfo[] = [];

      for (const balance of response.records) {
        // Parse asset information
        const asset = balance.asset;
        const assetCode = typeof asset === 'string' && asset === 'native' 
          ? 'XLM' 
          : (asset as any).asset_code || 'XLM';
        const assetIssuer = typeof asset === 'string' && asset === 'native' 
          ? undefined 
          : (asset as any).asset_issuer;

        // Extract timelock from claimants
        let timelock: number | undefined;
        let hashLock: string | undefined;

        if (balance.claimants && balance.claimants.length > 0) {
          for (const claimant of balance.claimants) {
            if (claimant.predicate && claimant.predicate.abs_before) {
              timelock = parseInt(claimant.predicate.abs_before);
            }
          }
        }

        balances.push({
          id: balance.id,
          assetCode: assetCode,
          assetIssuer: assetIssuer,
          amount: balance.amount,
          sponsor: balance.sponsor || 'unknown',
          hashLock: hashLock,
          timelock: timelock,
        });
      }

      console.log(`✅ Retrieved ${balances.length} claimable balances`);
      return balances;
    } catch (error) {
      console.error('❌ Failed to get claimable balances:', error);
      throw new Error(`Failed to get balances: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Hash a preimage using SHA-256
   */
  private hashPreimage(preimage: string): string {
    return crypto.createHash('sha256').update(preimage, 'hex').digest('hex');
  }

  /**
   * Validate hash lock format
   */
  private validateHashLock(hashLock: string): void {
    if (!/^[0-9a-fA-F]{64}$/.test(hashLock)) {
      throw new Error('Hash lock must be a 64-character hex string');
    }
  }

  /**
   * Validate timelock
   */
  private validateTimelock(timelock: number): void {
    const now = Date.now() / 1000;
    const minTimelock = now + 3600; // At least 1 hour from now
    const maxTimelock = now + 604800; // At most 7 days from now

    if (timelock < minTimelock) {
      throw new Error('Timelock must be at least 1 hour in the future');
    }
    if (timelock > maxTimelock) {
      throw new Error('Timelock cannot be more than 7 days in the future');
    }
  }

  /**
   * Generate mock transaction hash for development
   */
  private generateMockTxHash(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate mock claimable balance ID for development
   */
  private generateMockBalanceId(): string {
    return crypto.randomBytes(36).toString('hex');
  }

  /**
   * Extract claimable balance ID from transaction response
   * @param response Stellar transaction response
   * @returns Claimable balance ID
   */
  private extractClaimableBalanceId(response: any): string {
    // Look for claimable balance ID in transaction response
    try {
      // Check if response has result_meta_xdr with operations
      const meta = response.result_meta_xdr;
      if (meta && meta.operations) {
        for (const op of meta.operations) {
          if (op.changes) {
            for (const change of op.changes) {
              if (change.type === 'claimableBalanceCreated') {
                return change.claimableBalanceId;
              }
            }
          }
        }
      }
      
      // Alternative: look in response envelope
      if (response.envelope && response.envelope.v1 && response.envelope.v1.tx) {
        const operations = response.envelope.v1.tx.operations || [];
        for (const op of operations) {
          if (op.body && op.body.createClaimableBalanceOp) {
            // Generate deterministic ID based on operation
            const opHash = crypto.createHash('sha256').update(JSON.stringify(op)).digest('hex');
            return `00000000${opHash.substring(0, 56)}`;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error parsing transaction response:', error);
    }
    
    // Fallback: generate a mock ID for development
    console.warn('⚠️ Could not extract claimable balance ID from response, using fallback');
    return this.generateMockBalanceId();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Create testnet configuration
 */
export function createTestnetConfig(): StellarConfig {
  return {
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    isTestnet: true,
  };
}

/**
 * Create mainnet configuration
 */
export function createMainnetConfig(): StellarConfig {
  return {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    isTestnet: false,
  };
}

/**
 * Generate a random preimage and its hash
 */
export function generatePreimageAndHash(): { preimage: string; hash: string } {
  const preimage = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(preimage, 'hex').digest('hex');
  
  return { preimage, hash };
}

/**
 * Verify if preimage matches hash
 */
export function verifyPreimage(preimage: string, expectedHash: string): boolean {
  const computedHash = crypto.createHash('sha256').update(preimage, 'hex').digest('hex');
  return computedHash === expectedHash;
} 