/**
 * @fileoverview Orders management service for FusionBridge API
 * @description Order storage, validation, and status tracking
 */

import { 
  ActiveOrder, 
  SignedOrderInput, 
  PaginatedResponse, 
  PaginationMeta,
  SecretInput,
  ResolverDataOutput,
  PublicSecret,
  Immutables
} from './types.js';
import { 
  generateOrderHash, 
  validatePagination,
  getCurrentTimestamp 
} from './utils.js';
import { RELAYER_CONFIG } from './index.js';

/**
 * Orders management service
 */
export class OrdersService {
  private activeOrders: Map<string, ActiveOrder> = new Map();
  private orderSecrets: Map<string, string[]> = new Map();
  private completedOrders: Set<string> = new Set();

  /**
   * Add new order
   */
  addOrder(signedOrder: SignedOrderInput): string {
    const orderHash = generateOrderHash(signedOrder.order, signedOrder.srcChainId);
    
    // Create active order
    const activeOrder: ActiveOrder = {
      orderHash,
      signature: signedOrder.signature,
      deadline: getCurrentTimestamp() + (24 * 60 * 60), // 24 hours default
      auctionStartDate: getCurrentTimestamp(),
      auctionEndDate: getCurrentTimestamp() + 300, // 5 minutes default
      quoteId: signedOrder.quoteId,
      remainingMakerAmount: signedOrder.order.makingAmount,
      makerBalance: signedOrder.order.makingAmount, // Mock - will be real in Phase 3
      makerAllowance: signedOrder.order.makingAmount, // Mock - will be real in Phase 3
      isMakerContract: false, // Will be checked in Phase 3
      extension: signedOrder.extension,
      srcChainId: signedOrder.srcChainId,
      dstChainId: this.getDstChainId(signedOrder.srcChainId), // Mock logic
      order: signedOrder.order
    };

    this.activeOrders.set(orderHash, activeOrder);
    
    // Store secret hashes if provided
    if (signedOrder.secretHashes && signedOrder.secretHashes.length > 0) {
      this.orderSecrets.set(orderHash, signedOrder.secretHashes);
    }

    console.log(`📋 Order added: ${orderHash}`);
    return orderHash;
  }

  /**
   * Get active orders with pagination and filtering
   */
  getActiveOrders(
    page?: number, 
    limit?: number, 
    srcChain?: number, 
    dstChain?: number
  ): PaginatedResponse<ActiveOrder> {
    const pagination = validatePagination(page, limit);
    
    let orders = Array.from(this.activeOrders.values());
    
    // Apply filters
    if (srcChain) {
      orders = orders.filter(order => order.srcChainId === srcChain);
    }
    
    if (dstChain) {
      orders = orders.filter(order => order.dstChainId === dstChain);
    }

    // Sort by auction start date (newest first)
    orders.sort((a, b) => b.auctionStartDate - a.auctionStartDate);
    
    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    // Create pagination meta
    const meta: PaginationMeta = {
      totalItems: orders.length,
      itemsPerPage: pagination.limit,
      totalPages: Math.ceil(orders.length / pagination.limit),
      currentPage: pagination.page
    };

    return {
      meta,
      items: paginatedOrders
    };
  }

  /**
   * Get orders by maker address
   */
  getOrdersByMaker(
    makerAddress: string,
    page?: number,
    limit?: number
  ): PaginatedResponse<ActiveOrder> {
    const pagination = validatePagination(page, limit);
    
    let orders = Array.from(this.activeOrders.values())
      .filter(order => order.order.maker.toLowerCase() === makerAddress.toLowerCase());
    
    // Sort by auction start date (newest first)
    orders.sort((a, b) => b.auctionStartDate - a.auctionStartDate);
    
    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    // Create pagination meta
    const meta: PaginationMeta = {
      totalItems: orders.length,
      itemsPerPage: pagination.limit,
      totalPages: Math.ceil(orders.length / pagination.limit),
      currentPage: pagination.page
    };

    return {
      meta,
      items: paginatedOrders
    };
  }

  /**
   * Get order by hash
   */
  getOrderByHash(orderHash: string): ActiveOrder | null {
    return this.activeOrders.get(orderHash) || null;
  }

  /**
   * Get order status
   */
  getOrderStatus(orderHash: string): any {
    const order = this.activeOrders.get(orderHash);
    
    if (!order) {
      return {
        orderHash,
        status: 'not_found',
        validation: 'unknown-failure'
      };
    }

    // Determine status based on current state
    let status = 'pending';
    if (this.completedOrders.has(orderHash)) {
      status = 'executed';
    } else if (getCurrentTimestamp() > order.deadline) {
      status = 'expired';
    }

    return {
      orderHash,
      status,
      validation: 'valid',
      order: order.order,
      points: {
        delay: 0,
        coefficient: 0
      },
      approximateTakingAmount: order.order.takingAmount,
      positiveSurplus: "0",
      fills: [], // Will be populated in Phase 4
      auctionStartDate: order.auctionStartDate,
      auctionDuration: 300,
      initialRateBump: 1000,
      createdAt: order.auctionStartDate,
      srcChainId: order.srcChainId,
      dstChainId: order.dstChainId,
      cancelable: true,
      takerAsset: order.order.takerAsset,
      timeLocks: "0x" // Will be populated in Phase 3
    };
  }

  /**
   * Get multiple order statuses
   */
  getOrderStatuses(orderHashes: string[]): any[] {
    return orderHashes.map(hash => this.getOrderStatus(hash));
  }

  /**
   * Submit secret for order
   */
  submitSecret(secretInput: SecretInput): boolean {
    const { secret, orderHash } = secretInput;
    
    const order = this.activeOrders.get(orderHash);
    if (!order) {
      throw new Error(`Order not found: ${orderHash}`);
    }

    // Store secret (basic implementation - will be enhanced in Phase 4)
    const existingSecrets = this.orderSecrets.get(orderHash) || [];
    existingSecrets.push(secret);
    this.orderSecrets.set(orderHash, existingSecrets);

    console.log(`🔐 Secret submitted for order: ${orderHash}`);
    return true;
  }

  /**
   * Get order secrets
   */
  getOrderSecrets(orderHash: string): ResolverDataOutput | null {
    const order = this.activeOrders.get(orderHash);
    if (!order) {
      return null;
    }

    const secrets = this.orderSecrets.get(orderHash) || [];
    
    // Mock implementation - will be enhanced in Phase 4
    const publicSecrets: PublicSecret[] = secrets.map((secret, index) => ({
      idx: index,
      secret
    }));

    const mockImmutables: Immutables = {
      orderHash,
      hashlock: "0x" + "0".repeat(64),
      maker: order.order.maker,
      taker: order.order.receiver,
      token: order.order.makerAsset,
      amount: order.order.makingAmount,
      safetyDeposit: "1000000000000000",
      timelocks: "0x"
    };

    return {
      orderType: 'SingleFill', // Will support MultipleFills in Phase 4
      secrets: publicSecrets,
      srcImmutables: mockImmutables,
      dstImmutables: {
        ...mockImmutables,
        token: order.order.takerAsset,
        amount: order.order.takingAmount
      },
      secretHashes: this.orderSecrets.get(orderHash) || []
    };
  }

  /**
   * Get ready to accept secret fills
   */
  getReadyToAcceptSecretFills(orderHash?: string): any {
    if (orderHash) {
      const order = this.activeOrders.get(orderHash);
      if (!order) {
        return { fills: [] };
      }

      return {
        fills: [
          {
            idx: 0,
            srcEscrowDeployTxHash: "0x" + "0".repeat(64),
            dstEscrowDeployTxHash: "0x" + "0".repeat(64)
          }
        ]
      };
    }

    // Return all ready orders
    const readyOrders = Array.from(this.activeOrders.values()).map(order => ({
      orderHash: order.orderHash,
      makerAddress: order.order.maker,
      fills: [
        {
          idx: 0,
          srcEscrowDeployTxHash: "0x" + "0".repeat(64),
          dstEscrowDeployTxHash: "0x" + "0".repeat(64)
        }
      ]
    }));

    return { orders: readyOrders };
  }

  /**
   * Get escrow factory address for chain
   */
  getEscrowFactory(chainId: number): { address: string } {
    const factoryAddresses: Record<number, string> = {
      1: process.env.ETHEREUM_ESCROW_FACTORY || '0x0000000000000000000000000000000000000000',
      11155111: process.env.SEPOLIA_ESCROW_FACTORY || '0x0000000000000000000000000000000000000000',
    };

    return {
      address: factoryAddresses[chainId] || '0x0000000000000000000000000000000000000000'
    };
  }

  /**
   * Remove order (mark as completed)
   */
  completeOrder(orderHash: string): void {
    this.activeOrders.delete(orderHash);
    this.completedOrders.add(orderHash);
    console.log(`✅ Order completed: ${orderHash}`);
  }

  /**
   * Get destination chain ID (mock logic - will be enhanced)
   */
  private getDstChainId(srcChainId: number): number {
    // Simple mapping for ETH-Stellar bridge
    if (srcChainId === 1 || srcChainId === 11155111) {
      return 999; // Mock Stellar chain ID
    }
    return 1; // Default to Ethereum mainnet
  }

  /**
   * Get order count
   */
  getOrderCount(): number {
    return this.activeOrders.size;
  }

  // ===== PARTIAL FILLS API METHODS (1inch Fusion+ Compliant) =====

  /**
   * Get all ready to accept secret fills
   */
  getAllReadyToAcceptSecretFills(): { orders: Array<{ orderHash: string; makerAddress: string; fills: Array<{ idx: number; srcEscrowDeployTxHash: string; dstEscrowDeployTxHash: string; }> }> } {
    const readyOrders: Array<{ orderHash: string; makerAddress: string; fills: Array<{ idx: number; srcEscrowDeployTxHash: string; dstEscrowDeployTxHash: string; }> }> = [];

    for (const [orderHash, order] of this.activeOrders.entries()) {
      const fills = [{
        idx: 0,
        srcEscrowDeployTxHash: `0x${orderHash.slice(2, 66)}`,
        dstEscrowDeployTxHash: `0x${orderHash.slice(2, 66).replace('a', 'b')}`
      }];

      readyOrders.push({
        orderHash,
        makerAddress: order.order.maker,
        fills
      });
    }

    return { orders: readyOrders };
  }

  /**
   * Get published secrets for order
   */
  getPublishedSecrets(orderHash: string): ResolverDataOutput {
    const order = this.activeOrders.get(orderHash);
    if (!order) {
      throw new Error('Order not found');
    }

    const secrets: PublicSecret[] = [];
    const orderSecrets = this.orderSecrets.get(orderHash) || [];

    orderSecrets.forEach((secret, index) => {
      secrets.push({
        idx: index,
        secret: secret
      });
    });

    const mockImmutables: Immutables = {
      orderHash,
      hashlock: `0x${orderHash.slice(2, 66)}`,
      maker: order.order.maker,
      taker: order.order.receiver,
      token: order.order.makerAsset,
      amount: order.order.makingAmount,
      safetyDeposit: '1000000000000000000', // 1 ETH
      timelocks: '86400' // 24 hours
    };

    return {
      orderType: orderSecrets.length > 1 ? 'MultipleFills' : 'SingleFill',
      secrets,
      srcImmutables: mockImmutables,
      dstImmutables: mockImmutables,
      secretHashes: orderSecrets.map((secret, index) => `0x${secret.slice(2, 66)}${index}`)
    };
  }

  /**
   * Get multiple order statuses
   */
  getMultipleOrderStatuses(orderHashes: string[]): Array<{ orderHash: string; status: string; validation: string; }> {
    return orderHashes.map(orderHash => {
      const order = this.activeOrders.get(orderHash);
      
      if (!order) {
        return {
          orderHash,
          status: 'expired',
          validation: 'unknown-failure'
        };
      }

      const currentTime = getCurrentTimestamp();
      let status = 'pending';
      
      if (currentTime > order.deadline) {
        status = 'expired';
      } else if (this.completedOrders.has(orderHash)) {
        status = 'executed';
      }

      return {
        orderHash,
        status,
        validation: 'valid'
      };
    });
  }

  /**
   * Get orders ready to execute public actions
   */
  getReadyToExecutePublicActions(): { actions: Array<{ action: string; immutables: Immutables; chainId: number; escrow: string; secret?: string; }> } {
    const actions: Array<{ action: string; immutables: Immutables; chainId: number; escrow: string; secret?: string; }> = [];
    const currentTime = getCurrentTimestamp();

    for (const [orderHash, order] of this.activeOrders.entries()) {
      if (currentTime > order.deadline) {
        const immutables: Immutables = {
          orderHash,
          hashlock: `0x${orderHash.slice(2, 66)}`,
          maker: order.order.maker,
          taker: order.order.receiver,
          token: order.order.makerAsset,
          amount: order.order.makingAmount,
          safetyDeposit: '1000000000000000000',
          timelocks: '86400'
        };

        actions.push({
          action: 'cancel',
          immutables,
          chainId: order.srcChainId,
          escrow: `0x${orderHash.slice(2, 42)}`
        });
      }
    }

    return { actions };
  }

  /**
   * Submit partial fill execution
   */
  submitPartialFill(fillData: {
    orderHash: string;
    fragmentIndex: number;
    fillAmount: string;
    resolver: string;
    secretHash: string;
    merkleProof: string[];
  }): { fillId: string; status: string; progress: number; } {
    const order = this.activeOrders.get(fillData.orderHash);
    if (!order) {
      throw new Error('Order not found');
    }

    const fillId = `fill_${fillData.orderHash}_${fillData.fragmentIndex}_${Date.now()}`;
    
    // Mock progress calculation
    const progress = Math.min(100, (fillData.fragmentIndex + 1) * 20);
    
    console.log(`🔄 Partial fill submitted: ${fillId} for order ${fillData.orderHash}`);
    
    return {
      fillId,
      status: 'executed',
      progress
    };
  }

  /**
   * Get order fragments
   */
  getOrderFragments(orderHash: string): { fragments: Array<{ fragmentIndex: number; fillPercentage: number; secretHash: string; status: string; }> } {
    const order = this.activeOrders.get(orderHash);
    if (!order) {
      throw new Error('Order not found');
    }

    const fragments = [];
    const fragmentCount = 5; // Default to 5 fragments
    
    for (let i = 0; i < fragmentCount; i++) {
      fragments.push({
        fragmentIndex: i,
        fillPercentage: 20, // 20% per fragment
        secretHash: `0x${orderHash.slice(2, 66)}${i}`,
        status: 'pending'
      });
    }

    return { fragments };
  }

  /**
   * Get order fill progress
   */
  getOrderProgress(orderHash: string): { 
    orderId: string;
    totalAmount: string;
    filledAmount: string;
    fillPercentage: number;
    fragmentsFilled: number;
    totalFragments: number;
    estimatedCompletion: number;
  } {
    const order = this.activeOrders.get(orderHash);
    if (!order) {
      throw new Error('Order not found');
    }

    // Mock progress data
    const fillPercentage = Math.floor(Math.random() * 100);
    const totalFragments = 5;
    const fragmentsFilled = Math.floor(fillPercentage / 20);

    return {
      orderId: orderHash,
      totalAmount: order.order.makingAmount,
      filledAmount: (BigInt(order.order.makingAmount) * BigInt(fillPercentage) / BigInt(100)).toString(),
      fillPercentage,
      fragmentsFilled,
      totalFragments,
      estimatedCompletion: Date.now() + 300000 // 5 minutes
    };
  }

  /**
   * Get fill recommendations
   */
  getFillRecommendations(orderHash: string): { 
    recommendations: Array<{
      fragmentIndex: number;
      recommendedFillAmount: string;
      expectedProfit: string;
      confidence: number;
      timeToExpiry: number;
    }> 
  } {
    const order = this.activeOrders.get(orderHash);
    if (!order) {
      throw new Error('Order not found');
    }

    const recommendations = [];
    const totalAmount = BigInt(order.order.makingAmount);
    const fragmentCount = 5;
    
    for (let i = 0; i < fragmentCount; i++) {
      const fillAmount = totalAmount / BigInt(fragmentCount);
      const confidence = 0.8 + (Math.random() * 0.2); // 80-100% confidence
      const timeToExpiry = order.deadline - getCurrentTimestamp();

      recommendations.push({
        fragmentIndex: i,
        recommendedFillAmount: fillAmount.toString(),
        expectedProfit: (fillAmount / BigInt(100)).toString(), // 1% profit estimate
        confidence,
        timeToExpiry
      });
    }

    return { recommendations };
  }

  /**
   * Clear expired orders
   */
  clearExpiredOrders(): number {
    const currentTime = getCurrentTimestamp();
    let removedCount = 0;

    for (const [orderHash, order] of this.activeOrders.entries()) {
      if (currentTime > order.deadline) {
        this.activeOrders.delete(orderHash);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Removed ${removedCount} expired orders`);
    }

    return removedCount;
  }
}

// Export singleton instance
export const ordersService = new OrdersService(); 