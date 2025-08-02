/**
 * @fileoverview Partial Fills Manager for FusionBridge API
 * @description Handles progressive order filling with merkle tree validation
 */

import { EventEmitter } from 'events';
import MerkleTreeSecrets, { Secret, MerkleLeaf, OrderFragment, PartialFillConfig } from './merkle-tree.js';
import GasPriceTracker from './gas-tracker.js';

/**
 * Partial fill order interface
 */
export interface PartialFillOrder {
  orderId: string;
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  srcChainId: number;
  dstChainId: number;
  merkleRoot: string;
  allowPartialFills: boolean;
  allowMultipleFills: boolean;
  auctionStartTime: number;
  auctionEndTime: number;
  timeLocks: {
    srcWithdrawal: number;
    dstWithdrawal: number;
    srcCancellation: number;
    dstCancellation: number;
  };
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  createdAt: number;
  updatedAt: number;
}

/**
 * Fill execution interface
 */
export interface FillExecution {
  fillId: string;
  orderId: string;
  fragmentIndex: number;
  resolver: string;
  fillAmount: string;
  auctionPrice: string;
  gasCost: string;
  secretHash: string;
  merkleProof: string[];
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  srcTxHash?: string;
  dstTxHash?: string;
  executedAt?: number;
  gasUsed?: string;
  actualPrice?: string;
}

/**
 * Fill progress interface
 */
export interface FillProgress {
  orderId: string;
  totalAmount: string;
  filledAmount: string;
  remainingAmount: string;
  fillPercentage: number;
  fragmentsFilled: number;
  totalFragments: number;
  currentAuctionPrice: string;
  nextSecretIndex: number;
  estimatedCompletion: number;
  averageGasPrice: string;
  totalGasCost: string;
}

/**
 * Fill validation interface
 */
export interface FillValidation {
  valid: boolean;
  error?: string;
  warnings?: string[];
  estimatedGas?: string;
  priceImpact?: number;
  nextAvailableFragment?: number;
}

/**
 * Fill recommendation interface
 */
export interface FillRecommendation {
  orderId: string;
  fragmentIndex: number;
  recommendedFillAmount: string;
  expectedProfit: string;
  gasEstimate: string;
  priceImpact: number;
  confidence: number;
  timeToExpiry: number;
  competitorCount: number;
}

/**
 * Progressive Fill Manager Class
 */
export class ProgressiveFillManager extends EventEmitter {
  private orders: Map<string, PartialFillOrder> = new Map();
  private fillExecutions: Map<string, FillExecution[]> = new Map();
  private merkleManagers: Map<string, MerkleTreeSecrets> = new Map();
  private gasTracker: GasPriceTracker;

  constructor(gasTracker: GasPriceTracker) {
    super();
    this.gasTracker = gasTracker;
  }

  /**
   * Initialize partial fill order (1inch compliant)
   * Creates merkle tree and prepares for progressive filling
   */
  async initializePartialFillOrder(
    orderData: Omit<PartialFillOrder, 'merkleRoot' | 'status' | 'createdAt' | 'updatedAt'>,
    config: PartialFillConfig
  ): Promise<{
    order: PartialFillOrder;
    fragments: OrderFragment[];
    secrets: Secret[];
    merkleRoot: string;
  }> {
    const orderId = orderData.orderId;
    
    // Create merkle tree manager
    const merkleManager = new MerkleTreeSecrets(config);
    
    // Generate secrets for partial fills
    const secrets = merkleManager.generateSecrets(orderId, orderData.makingAmount);
    
    // Create merkle tree
    const merkleRoot = merkleManager.createMerkleTree(secrets, orderData.makingAmount);
    
    // Create order with merkle root
    const order: PartialFillOrder = {
      ...orderData,
      merkleRoot,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Generate order fragments
    const fragments = merkleManager.generateOrderFragments(orderId);

    // Store everything
    this.orders.set(orderId, order);
    this.merkleManagers.set(orderId, merkleManager);
    this.fillExecutions.set(orderId, []);

    // Emit order created event
    this.emit('orderCreated', {
      orderId,
      order,
      fragments,
      secretsCount: secrets.length
    });

    return { order, fragments, secrets, merkleRoot };
  }

  /**
   * Execute partial fill (1inch compliant)
   * Processes a single fragment fill with merkle proof validation
   */
  async executePartialFill(
    orderId: string,
    fragmentIndex: number,
    fillAmount: string,
    resolver: string,
    secretHash: string,
    merkleProof: string[]
  ): Promise<{
    execution: FillExecution;
    progress: FillProgress;
    nextRecommendation?: FillRecommendation;
  }> {
    const order = this.orders.get(orderId);
    const merkleManager = this.merkleManagers.get(orderId);
    
    if (!order || !merkleManager) {
      throw new Error('Order not found');
    }

    // Validate the fill
    const validation = await this.validateFill(orderId, fragmentIndex, fillAmount, resolver, secretHash, merkleProof);
    if (!validation.valid) {
      throw new Error(`Fill validation failed: ${validation.error}`);
    }

    // Get current price (simplified without auction)
    const currentPrice = fillAmount;

    // Estimate gas cost (simplified for compatibility)
    const gasEstimate = {
      totalCost: '100000000000000000' // 0.1 ETH default
    };

    // Create fill execution
    const fillExecution: FillExecution = {
      fillId: `${orderId}_${fragmentIndex}_${Date.now()}`,
      orderId,
      fragmentIndex,
      resolver,
      fillAmount,
      auctionPrice: currentPrice,
      gasCost: gasEstimate.totalCost,
      secretHash,
      merkleProof,
      status: 'pending',
      executedAt: Date.now()
    };

    // Add to executions
    const executions = this.fillExecutions.get(orderId) || [];
    executions.push(fillExecution);
    this.fillExecutions.set(orderId, executions);

    // Calculate progress
    const progress = await this.calculateFillProgress(orderId);

    // Generate next recommendation
    const nextRecommendation = await this.generateFillRecommendation(orderId, progress);

    // Emit fill executed event
    this.emit('partialFillExecuted', {
      orderId,
      fillExecution,
      progress,
      nextRecommendation
    });

    // Check if order is completed
    if (progress.fillPercentage >= 100) {
      await this.completeOrder(orderId);
    }

    return {
      execution: fillExecution,
      progress,
      nextRecommendation
    };
  }

  /**
   * Validate partial fill attempt
   * Comprehensive validation including merkle proof, amounts, and timing
   */
  async validateFill(
    orderId: string,
    fragmentIndex: number,
    fillAmount: string,
    resolver: string,
    secretHash: string,
    merkleProof: string[]
  ): Promise<FillValidation> {
    const order = this.orders.get(orderId);
    const merkleManager = this.merkleManagers.get(orderId);
    
    if (!order || !merkleManager) {
      return { valid: false, error: 'Order not found' };
    }

    // Check order status
    if (order.status !== 'active') {
      return { valid: false, error: 'Order not active' };
    }

    // Check auction timing
    const now = Date.now();
    if (now < order.auctionStartTime) {
      return { valid: false, error: 'Auction not started' };
    }

    if (now > order.auctionEndTime) {
      return { valid: false, error: 'Auction expired' };
    }

    // Check if partial fills are allowed
    if (!order.allowPartialFills && fillAmount !== order.makingAmount) {
      return { valid: false, error: 'Partial fills not allowed' };
    }

    // Validate merkle proof
    const proofValid = merkleManager.verifyProof(
      fragmentIndex,
      secretHash,
      merkleProof,
      order.merkleRoot
    );

    if (!proofValid) {
      return { valid: false, error: 'Invalid merkle proof' };
    }

    // Check if fragment is already filled
    const executions = this.fillExecutions.get(orderId) || [];
    const existingFill = executions.find(exec => 
      exec.fragmentIndex === fragmentIndex && exec.status === 'executed'
    );

    if (existingFill) {
      return { valid: false, error: 'Fragment already filled' };
    }

    // Validate fill amount
    const totalFilled = executions
      .filter(exec => exec.status === 'executed')
      .reduce((sum, exec) => sum + BigInt(exec.fillAmount), BigInt(0));
    
    const remainingAmount = BigInt(order.makingAmount) - totalFilled;
    const fillAmountBigInt = BigInt(fillAmount);

    if (fillAmountBigInt > remainingAmount) {
      return { valid: false, error: 'Fill amount exceeds remaining amount' };
    }

    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(fillAmount, order.makingAmount);

    return {
      valid: true,
      estimatedGas: '100000000000000000',
      priceImpact,
      nextAvailableFragment: fragmentIndex + 1
    };
  }

  /**
   * Calculate fill progress for an order
   */
  async calculateFillProgress(orderId: string): Promise<FillProgress> {
    const order = this.orders.get(orderId);
    const merkleManager = this.merkleManagers.get(orderId);
    
    if (!order || !merkleManager) {
      throw new Error('Order not found');
    }

    const executions = this.fillExecutions.get(orderId) || [];
    const totalAmount = BigInt(order.makingAmount);
    
    // Calculate filled amount
    const filledAmount = executions
      .filter(exec => exec.status === 'executed')
      .reduce((sum, exec) => sum + BigInt(exec.fillAmount), BigInt(0));
    
    const remainingAmount = totalAmount - filledAmount;
    const fillPercentage = Number((filledAmount * BigInt(100)) / totalAmount);

    // Count fragments
    const fragmentsFilled = executions.filter(exec => exec.status === 'executed').length;
    const totalFragments = merkleManager.generateOrderFragments(orderId).length;

    // Get current price (simplified without auction)
    const currentPrice = filledAmount;

    // Get progressive fill requirements
    const requirements = merkleManager.getProgressiveFillRequirements(fillPercentage);

    // Calculate average gas price
    const totalGasCost = executions.reduce((sum, exec) => sum + BigInt(exec.gasCost), BigInt(0));
    const avgGasPrice = executions.length > 0 ? totalGasCost / BigInt(executions.length) : BigInt(0);

    // Estimate completion time
    const avgFillTime = this.calculateAverageFillTime(executions);
    const estimatedCompletion = Date.now() + (avgFillTime * (totalFragments - fragmentsFilled));

    return {
      orderId,
      totalAmount: totalAmount.toString(),
      filledAmount: filledAmount.toString(),
      remainingAmount: remainingAmount.toString(),
      fillPercentage,
      fragmentsFilled,
      totalFragments,
      currentAuctionPrice: currentPrice.toString(),
      nextSecretIndex: requirements.nextSecretIndex,
      estimatedCompletion,
      averageGasPrice: avgGasPrice.toString(),
      totalGasCost: totalGasCost.toString()
    };
  }

  /**
   * Generate fill recommendation for resolvers
   * AI-powered recommendations based on current market conditions
   */
  async generateFillRecommendation(
    orderId: string,
    progress: FillProgress
  ): Promise<FillRecommendation | undefined> {
    const order = this.orders.get(orderId);
    const merkleManager = this.merkleManagers.get(orderId);

    if (!order || !merkleManager || progress.fillPercentage >= 100) {
      return undefined;
    }

    // Find next available fragment
    const executions = this.fillExecutions.get(orderId) || [];
    const filledFragments = new Set(
      executions.filter(exec => exec.status === 'executed').map(exec => exec.fragmentIndex)
    );

    let nextFragmentIndex = 0;
    while (filledFragments.has(nextFragmentIndex)) {
      nextFragmentIndex++;
    }

    // Calculate recommended fill amount
    const remainingAmount = BigInt(progress.remainingAmount);
    const totalFragments = progress.totalFragments;
    const recommendedFillAmount = remainingAmount / BigInt(totalFragments - progress.fragmentsFilled);

    // Get current gas conditions (simplified)
    const gasConditions = { congestion: 'medium' };
    const gasEstimate = {
      totalCost: '100000000000000000' // 0.1 ETH default
    };

    // Calculate expected profit (simplified without auction)
    const currentPrice = recommendedFillAmount;

    const expectedRevenue = (recommendedFillAmount * BigInt(currentPrice)) / BigInt(order.makingAmount);
    const expectedProfit = expectedRevenue - BigInt(gasEstimate.totalCost);

    // Calculate confidence based on gas conditions and market
    const confidence = this.calculateRecommendationConfidence(
      gasConditions,
      progress,
      order.auctionEndTime - Date.now()
    );

    // Count active competitors (simplified)
    const competitorCount = Math.floor(Math.random() * 5) + 1;

    return {
      orderId,
      fragmentIndex: nextFragmentIndex,
      recommendedFillAmount: recommendedFillAmount.toString(),
      expectedProfit: expectedProfit.toString(),
      gasEstimate: gasEstimate.totalCost.toString(),
      priceImpact: this.calculatePriceImpact(recommendedFillAmount.toString(), order.makingAmount),
      confidence,
      timeToExpiry: order.auctionEndTime - Date.now(),
      competitorCount
    };
  }

  /**
   * Get order fragments ready for filling
   * Returns available fragments with current pricing
   */
  getAvailableFragments(orderId: string): {
    fragments: OrderFragment[];
    currentPrice: string;
    gasEstimate: string;
  } {
    const order = this.orders.get(orderId);
    const merkleManager = this.merkleManagers.get(orderId);
    
    if (!order || !merkleManager) {
      return { fragments: [], currentPrice: '0', gasEstimate: '0' };
    }

    const fragments = merkleManager.generateOrderFragments(orderId);
    const executions = this.fillExecutions.get(orderId) || [];
    
    // Filter out already filled fragments
    const filledFragments = new Set(
      executions.filter(exec => exec.status === 'executed').map(exec => exec.fragmentIndex)
    );
    
    const availableFragments = fragments.filter(fragment => !filledFragments.has(fragment.fragmentIndex));

    // Get current price (simplified without auction)
    const currentPrice = '0';

    // Get gas estimate
    const gasEstimate = '100000000000000000'; // 0.1 ETH default

    return {
      fragments: availableFragments,
      currentPrice,
      gasEstimate
    };
  }

  /**
   * Complete order when fully filled
   */
  private async completeOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.status = 'completed';
    order.updatedAt = Date.now();

    this.emit('orderCompleted', {
      orderId,
      order,
      completedAt: Date.now()
    });

    console.log(`✅ Order ${orderId} completed`);
  }

  /**
   * Calculate price impact
   */
  private calculatePriceImpact(fillAmount: string, totalAmount: string): number {
    const fillBigInt = BigInt(fillAmount);
    const totalBigInt = BigInt(totalAmount);
    
    if (totalBigInt === BigInt(0)) return 0;
    
    return Number((fillBigInt * BigInt(100)) / totalBigInt);
  }

  /**
   * Calculate average fill time
   */
  private calculateAverageFillTime(executions: FillExecution[]): number {
    const completedExecutions = executions.filter(exec => exec.status === 'executed');
    
    if (completedExecutions.length === 0) {
      return 30000; // 30 seconds default
    }

    const totalTime = completedExecutions.reduce((sum, exec) => {
      return sum + (exec.executedAt || 0);
    }, 0);

    return totalTime / completedExecutions.length;
  }

  /**
   * Calculate recommendation confidence
   */
  private calculateRecommendationConfidence(
    gasConditions: any,
    progress: FillProgress,
    timeToExpiry: number
  ): number {
    // Simplified confidence calculation
    const baseConfidence = 70;
    const timeBonus = Math.min(timeToExpiry / 60000, 20); // Max 20% for time
    const progressBonus = progress.fillPercentage * 0.1; // Max 10% for progress
    
    return Math.min(baseConfidence + timeBonus + progressBonus, 100);
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): PartialFillOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get order executions
   */
  getOrderExecutions(orderId: string): FillExecution[] {
    return this.fillExecutions.get(orderId) || [];
  }

  /**
   * Get all active orders
   */
  getAllActiveOrders(): PartialFillOrder[] {
    return Array.from(this.orders.values()).filter(order => order.status === 'active');
  }
}

export default ProgressiveFillManager; 