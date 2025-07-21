/**
 * @fileoverview Dutch Auction Calculator for FusionBridge API
 * @description 1inch Fusion+ compliant auction pricing mechanism
 */

import { AuctionPoint, GasCostConfig } from './types.js';
import { getCurrentTimestamp } from './utils.js';

/**
 * Dutch Auction configuration
 */
export interface AuctionConfig {
  startTime: number;
  auctionDuration: number;
  initialRateBump: number;
  points: AuctionPoint[];
  gasCost: GasCostConfig;
}

/**
 * Auction pricing result
 */
export interface AuctionPricing {
  currentPrice: string;
  priceDecay: number;
  timeElapsed: number;
  timeRemaining: number;
  auctionProgress: number;
  gasAdjustment: string;
  finalPrice: string;
}

/**
 * Dutch Auction Calculator Class
 */
export class DutchAuctionCalculator {
  private config: AuctionConfig;
  private baseAmount: bigint;
  private currentGasPrice: bigint;

  constructor(config: AuctionConfig, baseAmount: string, currentGasPrice: string = "20000000000") {
    this.config = config;
    this.baseAmount = BigInt(baseAmount);
    this.currentGasPrice = BigInt(currentGasPrice); // in wei
  }

  /**
   * Calculate current auction price
   */
  calculateCurrentPrice(): AuctionPricing {
    const currentTime = getCurrentTimestamp();
    const timeElapsed = Math.max(0, currentTime - this.config.startTime);
    const timeRemaining = Math.max(0, this.config.auctionDuration - timeElapsed);
    const auctionProgress = Math.min(1, timeElapsed / this.config.auctionDuration);

    // Calculate base price decay
    const priceDecay = this.calculatePriceDecay(auctionProgress);
    
    // Apply auction points for non-linear pricing
    const pointAdjustment = this.calculatePointAdjustment(timeElapsed);
    
    // Calculate gas-sensitive adjustment
    const gasAdjustment = this.calculateGasAdjustment();
    
    // Calculate final price
    const basePrice = this.applyRateBump(this.baseAmount, priceDecay);
    const pointAdjustedPrice = this.applyPointAdjustment(basePrice, pointAdjustment);
    const finalPrice = this.applyGasAdjustment(pointAdjustedPrice, gasAdjustment);

    return {
      currentPrice: basePrice.toString(),
      priceDecay,
      timeElapsed,
      timeRemaining,
      auctionProgress,
      gasAdjustment: gasAdjustment.toString(),
      finalPrice: finalPrice.toString()
    };
  }

  /**
   * Calculate price decay based on auction progress
   */
  private calculatePriceDecay(progress: number): number {
    // 1inch Fusion+ uses exponential decay for better price discovery
    // Standard formula: decay = 1 - (progress^2)
    const linearDecay = progress;
    const exponentialDecay = Math.pow(progress, 1.5);
    
    // Blend linear and exponential for optimal price discovery
    return 0.3 * linearDecay + 0.7 * exponentialDecay;
  }

  /**
   * Apply initial rate bump
   */
  private applyRateBump(amount: bigint, decay: number): bigint {
    const rateBumpBps = this.config.initialRateBump;
    const rateBumpMultiplier = BigInt(10000 - Math.floor(decay * rateBumpBps));
    return (amount * rateBumpMultiplier) / BigInt(10000);
  }

  /**
   * Calculate point-based adjustment
   */
  private calculatePointAdjustment(timeElapsed: number): number {
    if (this.config.points.length === 0) {
      return 0;
    }

    let adjustment = 0;
    let cumulativeTime = 0;

    for (const point of this.config.points) {
      cumulativeTime += point.delay;
      
      if (timeElapsed >= cumulativeTime) {
        // Apply this point's coefficient
        adjustment = point.coefficient;
      } else {
        // Interpolate between current and next point
        const prevTime = cumulativeTime - point.delay;
        const progress = (timeElapsed - prevTime) / point.delay;
        adjustment = adjustment + (point.coefficient - adjustment) * progress;
        break;
      }
    }

    return adjustment;
  }

  /**
   * Apply point adjustment to price
   */
  private applyPointAdjustment(price: bigint, adjustment: number): bigint {
    const adjustmentBps = Math.floor(adjustment);
    const adjustmentMultiplier = BigInt(10000 + adjustmentBps);
    return (price * adjustmentMultiplier) / BigInt(10000);
  }

  /**
   * Calculate gas-sensitive adjustment
   */
  private calculateGasAdjustment(): bigint {
    const gasBumpEstimate = BigInt(this.config.gasCost.gasBumpEstimate);
    const gasPriceEstimate = BigInt(this.config.gasCost.gasPriceEstimate + "000000000"); // convert gwei to wei
    
    // Gas cost = gasLimit * gasPrice
    const estimatedGasLimit = BigInt(200000); // Estimated gas for cross-chain transaction
    const gasCost = estimatedGasLimit * (this.currentGasPrice > gasPriceEstimate ? this.currentGasPrice : gasPriceEstimate);
    
    // Apply gas bump
    const gasAdjustment = (gasCost * gasBumpEstimate) / BigInt(10000);
    
    return gasAdjustment;
  }

  /**
   * Apply gas adjustment to price
   */
  private applyGasAdjustment(price: bigint, gasAdjustment: bigint): bigint {
    return price + gasAdjustment;
  }

  /**
   * Get optimal fill amount based on current auction state
   */
  getOptimalFillAmount(maxAmount: string): string {
    const pricing = this.calculateCurrentPrice();
    const maxAmountBigInt = BigInt(maxAmount);
    
    // If auction is nearly complete, allow full fill
    if (pricing.auctionProgress > 0.9) {
      return maxAmount;
    }
    
    // For early auction, suggest partial fill for better price discovery
    const optimalFillRatio = Math.min(1, 0.1 + pricing.auctionProgress * 0.9);
    const optimalAmount = (maxAmountBigInt * BigInt(Math.floor(optimalFillRatio * 10000))) / BigInt(10000);
    
    return optimalAmount.toString();
  }

  /**
   * Predict price at future time
   */
  predictPriceAt(futureTime: number): string {
    const originalStartTime = this.config.startTime;
    
    // Temporarily adjust start time for prediction
    this.config.startTime = futureTime - (getCurrentTimestamp() - originalStartTime);
    
    const pricing = this.calculateCurrentPrice();
    
    // Restore original start time
    this.config.startTime = originalStartTime;
    
    return pricing.finalPrice;
  }

  /**
   * Get auction curve data for visualization
   */
  getAuctionCurve(dataPoints: number = 100): Array<{time: number, price: string}> {
    const curve: Array<{time: number, price: string}> = [];
    const timeStep = this.config.auctionDuration / dataPoints;
    
    for (let i = 0; i <= dataPoints; i++) {
      const time = this.config.startTime + (i * timeStep);
      const price = this.predictPriceAt(time);
      curve.push({ time, price });
    }
    
    return curve;
  }

  /**
   * Check if auction is active
   */
  isAuctionActive(): boolean {
    const currentTime = getCurrentTimestamp();
    return currentTime >= this.config.startTime && 
           currentTime <= (this.config.startTime + this.config.auctionDuration);
  }

  /**
   * Get time until auction starts
   */
  getTimeUntilStart(): number {
    const currentTime = getCurrentTimestamp();
    return Math.max(0, this.config.startTime - currentTime);
  }

  /**
   * Get auction status
   */
  getAuctionStatus(): 'pending' | 'active' | 'completed' {
    const currentTime = getCurrentTimestamp();
    
    if (currentTime < this.config.startTime) {
      return 'pending';
    } else if (currentTime <= (this.config.startTime + this.config.auctionDuration)) {
      return 'active';
    } else {
      return 'completed';
    }
  }

  /**
   * Calculate minimum acceptable price (reserve price)
   */
  getReservePrice(): string {
    // Reserve price is typically 70-80% of the initial price
    const reserveRatio = 0.75;
    const reservePrice = (this.baseAmount * BigInt(Math.floor(reserveRatio * 10000))) / BigInt(10000);
    return reservePrice.toString();
  }

  /**
   * Static method to create auction from preset
   */
  static fromPreset(
    presetType: 'fast' | 'medium' | 'slow',
    baseAmount: string,
    startTime?: number,
    gasPrice?: string
  ): DutchAuctionCalculator {
    const presetConfigs = {
      fast: {
        auctionDuration: 120,
        initialRateBump: 1000,
        points: [
          { delay: 12, coefficient: 455 },
          { delay: 24, coefficient: 300 },
          { delay: 48, coefficient: 150 }
        ],
        gasCost: {
          gasBumpEstimate: 80,
          gasPriceEstimate: "30"
        }
      },
      medium: {
        auctionDuration: 180,
        initialRateBump: 750,
        points: [
          { delay: 18, coefficient: 375 },
          { delay: 36, coefficient: 250 },
          { delay: 72, coefficient: 125 }
        ],
        gasCost: {
          gasBumpEstimate: 60,
          gasPriceEstimate: "20"
        }
      },
      slow: {
        auctionDuration: 300,
        initialRateBump: 500,
        points: [
          { delay: 30, coefficient: 250 },
          { delay: 60, coefficient: 150 },
          { delay: 120, coefficient: 75 }
        ],
        gasCost: {
          gasBumpEstimate: 40,
          gasPriceEstimate: "15"
        }
      }
    };

    const config = presetConfigs[presetType];
    const auctionConfig: AuctionConfig = {
      startTime: startTime || getCurrentTimestamp(),
      auctionDuration: config.auctionDuration,
      initialRateBump: config.initialRateBump,
      points: config.points,
      gasCost: config.gasCost
    };

    return new DutchAuctionCalculator(auctionConfig, baseAmount, gasPrice);
  }
}

/**
 * Utility functions for auction calculations
 */
export class AuctionUtils {
  
  /**
   * Calculate optimal auction start time based on network conditions
   */
  static calculateOptimalStartTime(preferredDelay: number = 5): number {
    // Add jitter to prevent all auctions starting at the same time
    const jitter = Math.random() * 3; // 0-3 seconds
    return getCurrentTimestamp() + preferredDelay + jitter;
  }

  /**
   * Estimate gas price based on network conditions
   */
  static async estimateGasPrice(): Promise<string> {
    // This would integrate with real gas price APIs in production
    // For now, return a mock value
    const baseGasPrice = 20; // 20 gwei
    const networkCongestion = Math.random() * 0.5 + 0.75; // 0.75-1.25 multiplier
    const estimatedGasPrice = Math.floor(baseGasPrice * networkCongestion);
    
    return estimatedGasPrice.toString();
  }

  /**
   * Calculate auction efficiency score
   */
  static calculateEfficiencyScore(
    startPrice: string,
    endPrice: string,
    auctionDuration: number,
    fillTime: number
  ): number {
    const priceImprovement = (BigInt(startPrice) - BigInt(endPrice)) / BigInt(startPrice);
    const timeEfficiency = 1 - (fillTime / auctionDuration);
    
    // Efficiency score combines price improvement and time efficiency
    const score = (Number(priceImprovement) * 0.7) + (timeEfficiency * 0.3);
    return Math.max(0, Math.min(1, score));
  }
}

export default DutchAuctionCalculator; 