/**
 * @fileoverview Resolver management system for 1inch Fusion+ partial fills
 * @description Resolver whitelist, competition, and performance tracking
 */

import { EventEmitter } from 'events';
import { OrdersService } from './orders.js';
import ProgressiveFillManager, { 
  PartialFillOrder, 
  FillExecution, 
  FillProgress, 
  FillRecommendation 
} from './partial-fills.js';

// Resolver status and permission levels
export enum ResolverStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
  Banned = 'banned'
}

export enum ResolverTier {
  Standard = 'standard',
  Premium = 'premium',
  Elite = 'elite',
  Unicorn = 'unicorn' // Highest tier with special privileges
}

export interface ResolverInfo {
  address: string;
  status: ResolverStatus;
  tier: ResolverTier;
  registeredAt: number;
  lastActiveAt: number;
  metadata: {
    name?: string;
    description?: string;
    website?: string;
    logo?: string;
    kycStatus?: 'pending' | 'verified' | 'rejected';
    kybStatus?: 'pending' | 'verified' | 'rejected';
  };
  performance: ResolverPerformance;
  permissions: ResolverPermissions;
  staking: ResolverStaking;
}

export interface ResolverPerformance {
  totalFills: number;
  successfulFills: number;
  totalVolume: string;
  averageGasPrice: string;
  averageExecutionTime: number;
  failureRate: number;
  reputationScore: number;
  lastUpdated: number;
}

export interface ResolverPermissions {
  canFillPartial: boolean;
  canFillMultiple: boolean;
  maxFillAmount: string;
  maxConcurrentFills: number;
  allowedChains: number[];
  priorityAccess: boolean;
  exclusiveAccess: boolean;
}

export interface ResolverStaking {
  stakedAmount: string;
  requiredStake: string;
  slashingHistory: SlashingEvent[];
  lastSlashingAt?: number;
}

export interface SlashingEvent {
  timestamp: number;
  amount: string;
  reason: string;
  orderId: string;
  resolved: boolean;
}

// Competition and auction interfaces
export interface ResolverCompetition {
  orderId: string;
  fragmentIndex: number;
  participants: CompetitionParticipant[];
  startTime: number;
  endTime: number;
  winnerAddress?: string;
  winningBid?: string;
  status: 'active' | 'ended' | 'cancelled';
}

export interface CompetitionParticipant {
  resolverAddress: string;
  bidAmount: string;
  gasPrice: string;
  timestamp: number;
  confidence: number;
}

export interface ResolverBid {
  orderId: string;
  fragmentIndex: number;
  resolverAddress: string;
  bidAmount: string;
  gasPrice: string;
  executionTime: number;
  confidence: number;
  timestamp: number;
}

// Resolver whitelist configuration
export interface WhitelistConfig {
  requireWhitelist: boolean;
  autoApproval: boolean;
  maxResolvers: number;
  stakingRequirement: string;
  kycRequired: boolean;
  kybRequired: boolean;
  competitionEnabled: boolean;
  minReputationScore: number;
}

export class ResolverManager extends EventEmitter {
  private resolvers: Map<string, ResolverInfo> = new Map();
  private competitions: Map<string, ResolverCompetition> = new Map();
  private ordersService: OrdersService;
  private progressiveFillManager?: ProgressiveFillManager;
  private config: WhitelistConfig;

  constructor(ordersService: OrdersService, config: WhitelistConfig) {
    super();
    this.ordersService = ordersService;
    this.config = config;
    this.initializeDefaultResolvers();
  }

  /**
   * Initialize default resolver entries for testing
   */
  private initializeDefaultResolvers(): void {
    const defaultResolvers = [
      {
        address: '0x742d35Cc6634C0532925a3b8D400e1e4dff7D88e',
        tier: ResolverTier.Elite,
        name: 'Elite Resolver Alpha'
      },
      {
        address: '0x1234567890123456789012345678901234567890',
        tier: ResolverTier.Premium,
        name: 'Premium Resolver Beta'
      },
      {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tier: ResolverTier.Standard,
        name: 'Standard Resolver Gamma'
      }
    ];

    defaultResolvers.forEach(resolver => {
      this.addResolver(resolver.address, {
        name: resolver.name,
        kycStatus: 'verified',
        kybStatus: 'verified'
      }, resolver.tier);
    });

    console.log('✅ Default resolvers initialized');
  }

  /**
   * Add resolver to whitelist
   */
  addResolver(
    address: string, 
    metadata: ResolverInfo['metadata'],
    tier: ResolverTier = ResolverTier.Standard
  ): boolean {
    if (this.resolvers.has(address)) {
      return false;
    }

    if (this.resolvers.size >= this.config.maxResolvers) {
      throw new Error('Maximum resolver limit reached');
    }

    const resolverInfo: ResolverInfo = {
      address,
      status: ResolverStatus.Active,
      tier,
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
      metadata,
      performance: {
        totalFills: 0,
        successfulFills: 0,
        totalVolume: '0',
        averageGasPrice: '0',
        averageExecutionTime: 0,
        failureRate: 0,
        reputationScore: tier === ResolverTier.Unicorn ? 100 : 50,
        lastUpdated: Date.now()
      },
      permissions: this.generatePermissions(tier),
      staking: {
        stakedAmount: '0',
        requiredStake: this.getRequiredStake(tier),
        slashingHistory: []
      }
    };

    this.resolvers.set(address, resolverInfo);
    
    this.emit('resolverAdded', {
      address,
      tier,
      timestamp: Date.now()
    });

    console.log(`✅ Resolver added: ${address} (${tier})`);
    return true;
  }

  /**
   * Remove resolver from whitelist
   */
  removeResolver(address: string): boolean {
    if (!this.resolvers.has(address)) {
      return false;
    }

    this.resolvers.delete(address);
    
    this.emit('resolverRemoved', {
      address,
      timestamp: Date.now()
    });

    console.log(`❌ Resolver removed: ${address}`);
    return true;
  }

  /**
   * Update resolver status
   */
  updateResolverStatus(address: string, status: ResolverStatus): boolean {
    const resolver = this.resolvers.get(address);
    if (!resolver) {
      return false;
    }

    resolver.status = status;
    resolver.lastActiveAt = Date.now();
    
    this.emit('resolverStatusUpdated', {
      address,
      status,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Check if resolver is whitelisted and active
   */
  isResolverAllowed(address: string): boolean {
    if (!this.config.requireWhitelist) {
      return true;
    }

    const resolver = this.resolvers.get(address);
    if (!resolver) {
      return false;
    }

    return resolver.status === ResolverStatus.Active;
  }

  /**
   * Get resolver permissions
   */
  getResolverPermissions(address: string): ResolverPermissions | null {
    const resolver = this.resolvers.get(address);
    return resolver ? resolver.permissions : null;
  }

  /**
   * Start competition for partial fill
   */
  startCompetition(orderId: string, fragmentIndex: number): ResolverCompetition {
    const competitionKey = `${orderId}_${fragmentIndex}`;
    
    if (this.competitions.has(competitionKey)) {
      throw new Error('Competition already exists for this fragment');
    }

    const competition: ResolverCompetition = {
      orderId,
      fragmentIndex,
      participants: [],
      startTime: Date.now(),
      endTime: Date.now() + 30000, // 30 seconds competition window
      status: 'active'
    };

    this.competitions.set(competitionKey, competition);
    
    this.emit('competitionStarted', {
      orderId,
      fragmentIndex,
      endTime: competition.endTime,
      timestamp: Date.now()
    });

    // Auto-end competition
    setTimeout(() => {
      this.endCompetition(competitionKey);
    }, 30000);

    console.log(`🏁 Competition started for ${orderId} fragment ${fragmentIndex}`);
    return competition;
  }

  /**
   * Submit bid for competition
   */
  submitBid(bid: ResolverBid): boolean {
    const competitionKey = `${bid.orderId}_${bid.fragmentIndex}`;
    const competition = this.competitions.get(competitionKey);
    
    if (!competition || competition.status !== 'active') {
      return false;
    }

    if (Date.now() > competition.endTime) {
      return false;
    }

    if (!this.isResolverAllowed(bid.resolverAddress)) {
      return false;
    }

    // Check if resolver already participated
    const existingParticipant = competition.participants.find(
      p => p.resolverAddress === bid.resolverAddress
    );

    if (existingParticipant) {
      // Update existing bid
      existingParticipant.bidAmount = bid.bidAmount;
      existingParticipant.gasPrice = bid.gasPrice;
      existingParticipant.timestamp = bid.timestamp;
      existingParticipant.confidence = bid.confidence;
    } else {
      // Add new participant
      competition.participants.push({
        resolverAddress: bid.resolverAddress,
        bidAmount: bid.bidAmount,
        gasPrice: bid.gasPrice,
        timestamp: bid.timestamp,
        confidence: bid.confidence
      });
    }

    this.emit('bidSubmitted', {
      orderId: bid.orderId,
      fragmentIndex: bid.fragmentIndex,
      resolverAddress: bid.resolverAddress,
      bidAmount: bid.bidAmount,
      timestamp: bid.timestamp
    });

    return true;
  }

  /**
   * End competition and select winner
   */
  endCompetition(competitionKey: string): string | null {
    const competition = this.competitions.get(competitionKey);
    if (!competition || competition.status !== 'active') {
      return null;
    }

    competition.status = 'ended';

    if (competition.participants.length === 0) {
      return null;
    }

    // Select winner based on multiple criteria
    const winner = this.selectWinner(competition.participants);
    
    if (winner) {
      competition.winnerAddress = winner.resolverAddress;
      competition.winningBid = winner.bidAmount;
      
      this.emit('competitionEnded', {
        orderId: competition.orderId,
        fragmentIndex: competition.fragmentIndex,
        winnerAddress: winner.resolverAddress,
        winningBid: winner.bidAmount,
        participantCount: competition.participants.length,
        timestamp: Date.now()
      });

      console.log(`🏆 Competition winner: ${winner.resolverAddress} for ${competition.orderId}`);
      return winner.resolverAddress;
    }

    return null;
  }

  /**
   * Select winner from competition participants
   */
  private selectWinner(participants: CompetitionParticipant[]): CompetitionParticipant | null {
    if (participants.length === 0) {
      return null;
    }

    // Score each participant
    const scoredParticipants = participants.map(participant => {
      const resolver = this.resolvers.get(participant.resolverAddress);
      if (!resolver) {
        return { ...participant, score: 0 };
      }

      let score = 0;
      
      // Bid amount (higher is better, but diminishing returns)
      const bidScore = Math.log(parseFloat(participant.bidAmount) + 1) * 10;
      score += bidScore;
      
      // Gas price (lower is better)
      const gasScore = Math.max(0, 50 - parseFloat(participant.gasPrice));
      score += gasScore;
      
      // Resolver reputation
      score += resolver.performance.reputationScore;
      
      // Tier bonus
      const tierBonus = {
        [ResolverTier.Standard]: 0,
        [ResolverTier.Premium]: 10,
        [ResolverTier.Elite]: 20,
        [ResolverTier.Unicorn]: 30
      };
      score += tierBonus[resolver.tier];
      
      // Success rate bonus
      const successRate = resolver.performance.totalFills > 0 
        ? resolver.performance.successfulFills / resolver.performance.totalFills
        : 0.5;
      score += successRate * 30;
      
      // Confidence bonus
      score += participant.confidence * 0.1;

      return { ...participant, score };
    });

    // Sort by score (highest first)
    scoredParticipants.sort((a, b) => b.score - a.score);
    
    return scoredParticipants[0];
  }

  /**
   * Update resolver performance after fill execution
   */
  updateResolverPerformance(address: string, execution: FillExecution): void {
    const resolver = this.resolvers.get(address);
    if (!resolver) {
      return;
    }

    resolver.performance.totalFills++;
    resolver.performance.lastUpdated = Date.now();
    resolver.lastActiveAt = Date.now();

    if (execution.status === 'executed') {
      resolver.performance.successfulFills++;
      resolver.performance.totalVolume = (
        BigInt(resolver.performance.totalVolume) + BigInt(execution.fillAmount)
      ).toString();
      
      // Update average gas price
      const avgGas = BigInt(resolver.performance.averageGasPrice);
      const newGas = BigInt(execution.gasCost);
      const newAvgGas = (avgGas + newGas) / BigInt(2);
      resolver.performance.averageGasPrice = newAvgGas.toString();
    }

    // Calculate failure rate
    resolver.performance.failureRate = 
      (resolver.performance.totalFills - resolver.performance.successfulFills) / 
      resolver.performance.totalFills;

    // Update reputation score
    resolver.performance.reputationScore = this.calculateReputationScore(resolver.performance);

    this.emit('performanceUpdated', {
      address,
      performance: resolver.performance,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate reputation score based on performance
   */
  private calculateReputationScore(performance: ResolverPerformance): number {
    let score = 50; // Base score
    
    // Success rate impact (0-40 points)
    const successRate = performance.totalFills > 0 
      ? performance.successfulFills / performance.totalFills 
      : 0.5;
    score += successRate * 40;
    
    // Volume impact (0-10 points)
    const volumeScore = Math.min(10, Math.log(parseFloat(performance.totalVolume) + 1));
    score += volumeScore;
    
    // Penalize high failure rate
    score -= performance.failureRate * 30;
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate permissions based on tier
   */
  private generatePermissions(tier: ResolverTier): ResolverPermissions {
    const basePermissions: ResolverPermissions = {
      canFillPartial: true,
      canFillMultiple: false,
      maxFillAmount: '1000000000000000000000', // 1000 tokens
      maxConcurrentFills: 1,
      allowedChains: [1, 137, 42161], // Ethereum, Polygon, Arbitrum
      priorityAccess: false,
      exclusiveAccess: false
    };

    switch (tier) {
      case ResolverTier.Premium:
        return {
          ...basePermissions,
          canFillMultiple: true,
          maxFillAmount: '10000000000000000000000', // 10,000 tokens
          maxConcurrentFills: 3,
          priorityAccess: true
        };
      
      case ResolverTier.Elite:
        return {
          ...basePermissions,
          canFillMultiple: true,
          maxFillAmount: '100000000000000000000000', // 100,000 tokens
          maxConcurrentFills: 10,
          priorityAccess: true,
          allowedChains: [1, 137, 42161, 10, 8453] // + Optimism, Base
        };
      
      case ResolverTier.Unicorn:
        return {
          ...basePermissions,
          canFillMultiple: true,
          maxFillAmount: '1000000000000000000000000', // 1,000,000 tokens
          maxConcurrentFills: 50,
          priorityAccess: true,
          exclusiveAccess: true,
          allowedChains: [1, 137, 42161, 10, 8453, 56, 43114] // + BSC, Avalanche
        };
      
      default:
        return basePermissions;
    }
  }

  /**
   * Get required stake amount for tier
   */
  private getRequiredStake(tier: ResolverTier): string {
    const stakes = {
      [ResolverTier.Standard]: '1000000000000000000', // 1 ETH
      [ResolverTier.Premium]: '10000000000000000000', // 10 ETH
      [ResolverTier.Elite]: '100000000000000000000', // 100 ETH
      [ResolverTier.Unicorn]: '1000000000000000000000' // 1000 ETH
    };
    
    return stakes[tier];
  }

  /**
   * Get all whitelisted resolvers
   */
  getResolvers(): ResolverInfo[] {
    return Array.from(this.resolvers.values());
  }

  /**
   * Get resolver by address
   */
  getResolver(address: string): ResolverInfo | null {
    return this.resolvers.get(address) || null;
  }

  /**
   * Get active competitions
   */
  getActiveCompetitions(): ResolverCompetition[] {
    return Array.from(this.competitions.values()).filter(c => c.status === 'active');
  }

  /**
   * Get competition by order and fragment
   */
  getCompetition(orderId: string, fragmentIndex: number): ResolverCompetition | null {
    const key = `${orderId}_${fragmentIndex}`;
    return this.competitions.get(key) || null;
  }

  /**
   * Get resolver recommendations for order
   */
  getResolverRecommendations(orderId: string): {
    resolver: ResolverInfo;
    score: number;
    reason: string;
  }[] {
    const activeResolvers = Array.from(this.resolvers.values())
      .filter(r => r.status === ResolverStatus.Active);

    return activeResolvers.map(resolver => {
      let score = resolver.performance.reputationScore;
      let reason = '';

      // Tier bonus
      const tierBonus = {
        [ResolverTier.Standard]: 0,
        [ResolverTier.Premium]: 10,
        [ResolverTier.Elite]: 20,
        [ResolverTier.Unicorn]: 30
      };
      score += tierBonus[resolver.tier];

      if (resolver.tier === ResolverTier.Unicorn) {
        reason = 'Unicorn resolver with exclusive access';
      } else if (resolver.permissions.priorityAccess) {
        reason = 'Priority access resolver';
      } else {
        reason = 'Standard resolver';
      }

      return { resolver, score, reason };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Set progressive fill manager
   */
  setProgressiveFillManager(manager: ProgressiveFillManager): void {
    this.progressiveFillManager = manager;
  }
}

export default ResolverManager; 