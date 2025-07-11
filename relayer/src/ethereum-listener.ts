/**
 * @fileoverview Ethereum Event Listener for FusionBridge
 * @description Monitors HTLCBridge contract events and triggers Stellar operations
 */

import { ethers, Contract, EventLog } from 'ethers';
import StellarClient, { CrossChainOrder } from '@fusionbridge/stellar';
import { RELAYER_CONFIG } from './index.js';

// HTLCBridge contract ABI (focusing on OrderCreated event)
const HTLC_BRIDGE_ABI = [
  "event OrderCreated(uint256 indexed orderId, address indexed sender, address indexed token, uint256 amount, bytes32 hashLock, uint256 timelock, uint256 feeRate, bool partialFillEnabled)",
  "event OrderClaimed(uint256 indexed orderId, address indexed claimer, uint256 amount, uint256 totalFilled, bytes32 preimage)",
  "event OrderRefunded(uint256 indexed orderId, address indexed sender, uint256 refundAmount)"
];

/**
 * Ethereum OrderCreated event data
 */
interface OrderCreatedEvent {
  orderId: bigint;
  sender: string;
  token: string;
  amount: bigint;
  hashLock: string;
  timelock: bigint;
  feeRate: bigint;
  partialFillEnabled: boolean;
  transactionHash: string;
  blockNumber: number;
}

/**
 * Ethereum Event Listener for HTLCBridge contract
 */
export class EthereumEventListener {
  private provider?: ethers.JsonRpcProvider;
  private contract?: Contract;
  private stellarClient?: StellarClient;
  private isListening: boolean = false;

  constructor() {
    // Lazy initialization - will be done in startListening()
  }

  /**
   * Initialize components with configuration
   */
  private initializeComponents() {
    if (this.provider) return; // Already initialized

    // In mock mode, don't initialize real provider to avoid RPC errors
    if (RELAYER_CONFIG.enableMockMode) {
      console.log('🧪 Mock mode: Skipping Ethereum provider initialization');
      // Initialize only Stellar client for mock mode
      this.stellarClient = new StellarClient(
        RELAYER_CONFIG.stellar.network === 'testnet',
        RELAYER_CONFIG.stellar.secretKey
      );
      return;
    }

    // Initialize Ethereum provider
    this.provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.ethereum.rpcUrl);
    
    // Initialize contract
    this.contract = new Contract(
      RELAYER_CONFIG.ethereum.contractAddress,
      HTLC_BRIDGE_ABI,
      this.provider
    );

    // Initialize Stellar client
    this.stellarClient = new StellarClient(
      RELAYER_CONFIG.stellar.network === 'testnet',
      RELAYER_CONFIG.stellar.secretKey
    );
  }

  /**
   * Start listening to Ethereum events
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  Event listener is already running');
      return;
    }

    try {
      // Initialize components first
      this.initializeComponents();

      console.log('🔄 Starting Ethereum event listener...');
      console.log(`📍 Contract address: ${RELAYER_CONFIG.ethereum.contractAddress}`);
      console.log(`🌐 Network: ${RELAYER_CONFIG.ethereum.network}`);

      // Validate configuration
      await this.validateConfiguration();

      // Set up event listener for OrderCreated events
      if (RELAYER_CONFIG.enableMockMode) {
        console.log('🧪 Mock mode: Simulating event listener (no real blockchain connection)');
      } else {
        this.contract!.on('OrderCreated', this.handleOrderCreatedEvent.bind(this));
      }

      this.isListening = true;
      console.log('✅ Ethereum event listener started successfully');
      console.log('👂 Listening for OrderCreated events...');

    } catch (error) {
      console.error('❌ Failed to start event listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      console.log('⚠️  Event listener is not running');
      return;
    }

    try {
      if (!RELAYER_CONFIG.enableMockMode) {
        this.contract?.removeAllListeners('OrderCreated');
      }
      this.isListening = false;
      console.log('🛑 Ethereum event listener stopped');
    } catch (error) {
      console.error('❌ Error stopping event listener:', error);
    }
  }

  /**
   * Handle OrderCreated event from HTLCBridge contract
   */
  private async handleOrderCreatedEvent(
    orderId: bigint,
    sender: string,
    token: string,
    amount: bigint,
    hashLock: string,
    timelock: bigint,
    feeRate: bigint,
    partialFillEnabled: boolean,
    event: EventLog
  ): Promise<void> {
    try {
      console.log('\n🚨 NEW ETHEREUM ORDER DETECTED!');
      console.log('================================');
      console.log(`🆔 Order ID: ${orderId.toString()}`);
      console.log(`👤 Sender: ${sender}`);
      console.log(`💰 Token: ${token}`);
      console.log(`💵 Amount: ${ethers.formatUnits(amount.toString(), 18)} tokens`);
      console.log(`🔒 Hash Lock: ${hashLock}`);
      console.log(`⏰ Timelock: ${new Date(Number(timelock) * 1000).toISOString()}`);
      console.log(`💸 Fee Rate: ${Number(feeRate) / 100}%`);
      console.log(`🔄 Partial Fill: ${partialFillEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`📝 Tx Hash: ${event.transactionHash}`);
      console.log(`🧱 Block: ${event.blockNumber}`);

      // Convert Ethereum event to CrossChainOrder format
      const crossChainOrder: CrossChainOrder = {
        ethereumOrderId: Number(orderId),
        ethereumTxHash: event.transactionHash,
        token: token,
        amount: amount.toString(),
        hashLock: hashLock,
        timelock: Number(timelock),
        sender: sender,
        recipient: sender, // For now, assume recipient is the same as sender
      };

      // Process the order (create Stellar HTLC)
      await this.processCrossChainOrder(crossChainOrder);

    } catch (error) {
      console.error('❌ Error handling OrderCreated event:', error);
    }
  }

  /**
   * Process cross-chain order by creating Stellar HTLC
   */
  private async processCrossChainOrder(order: CrossChainOrder): Promise<void> {
    try {
      console.log('\n🌉 PROCESSING CROSS-CHAIN ORDER');
      console.log('==============================');
      
      if (RELAYER_CONFIG.enableMockMode) {
        console.log('🧪 MOCK MODE: Simulating Stellar HTLC creation...');
        console.log(`✅ Mock Stellar HTLC created for order ${order.ethereumOrderId}`);
        console.log(`🆔 Mock Balance ID: cb-${order.ethereumOrderId}-${Date.now()}`);
        return;
      }

      // Create Stellar HTLC using the StellarClient
      console.log('🌟 Creating Stellar HTLC...');
      const result = await this.stellarClient!.createHTLCFromEthereumOrder(order);

      if (result.success) {
        console.log('✅ Stellar HTLC created successfully!');
        console.log(`🆔 Balance ID: ${result.balanceId}`);
        console.log(`📝 Stellar Tx Hash: ${result.txHash}`);
      } else {
        console.error('❌ Failed to create Stellar HTLC:', result.error);
      }

    } catch (error) {
      console.error('❌ Error processing cross-chain order:', error);
    }
  }

  /**
   * Validate configuration before starting
   */
  private async validateConfiguration(): Promise<void> {
    // Check if contract address is set
    if (!RELAYER_CONFIG.ethereum.contractAddress || RELAYER_CONFIG.ethereum.contractAddress === '') {
      throw new Error('HTLCBridge contract address not configured');
    }

    // Skip network validation in mock mode
    if (RELAYER_CONFIG.enableMockMode) {
      console.log('🧪 Mock mode enabled - skipping network validation');
      console.log('✅ Mock configuration validated');
      return;
    }

    // Check if RPC URL is valid
    if (RELAYER_CONFIG.ethereum.rpcUrl.includes('YOUR_')) {
      throw new Error('Ethereum RPC URL contains placeholder values');
    }

    try {
      // Test provider connection
      const network = await this.provider!.getNetwork();
      console.log(`🔗 Connected to Ethereum network: ${network.name} (Chain ID: ${network.chainId})`);

      // Test contract deployment
      const code = await this.provider!.getCode(RELAYER_CONFIG.ethereum.contractAddress);
      if (code === '0x') {
        throw new Error(`No contract deployed at address: ${RELAYER_CONFIG.ethereum.contractAddress}`);
      }

      console.log('✅ Contract validation successful');

    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw error;
    }
  }

  /**
   * Get current listening status
   */
  public isListeningToEvents(): boolean {
    return this.isListening;
  }

  /**
   * Get contract address being monitored
   */
  public getContractAddress(): string {
    return RELAYER_CONFIG.ethereum.contractAddress;
  }
}

// Export singleton instance
export const ethereumListener = new EthereumEventListener(); 