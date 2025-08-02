/**
 * @fileoverview Preset Manager for FusionBridge API
 * @description Manages auction presets and configurations
 */


import { AuctionPoint } from './types.js';
import { gasPriceTracker } from './gas-tracker.js';
import { getCurrentTimestamp } from './utils.js';

/**
 * Preset configuration
 */
export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  auctionDuration: number;
  initialRateBump: number;
  points: AuctionPoint[];
  gasCost: {
    gasBumpEstimate: number;
    gasPriceEstimate: string;
  };
  conditions: {
    minAmount?: string;
    maxAmount?: string;
    supportedChains?: string[];
    supportedTokens?: string[];
  };
  metadata: {
    created: number;
    lastUsed: number;
    usageCount: number;
    successRate: number;
  };
}

/**
 * Preset statistics
 */
export interface PresetStats {
  totalQuotes: number;
  successfulFills: number;
  averageExecutionTime: number;
  averagePriceImprovement: number;
  userSatisfaction: number;
}

/**
 * Preset Manager Class
 */
export class PresetManager {
  private presets: Map<string, PresetConfig> = new Map();
  private presetStats: Map<string, PresetStats> = new Map();

  constructor() {
    this.initializeDefaultPresets();
  }

  /**
   * Get all available presets
   */
  getAllPresets(): PresetConfig[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get preset by ID
   */
  getPreset(id: string): PresetConfig | null {
    return this.presets.get(id) || null;
  }

  /**
   * Get preset by name
   */
  getPresetByName(name: string): PresetConfig | null {
    for (const preset of this.presets.values()) {
      if (preset.name === name) {
        return preset;
      }
    }
    return null;
  }

  /**
   * Create new preset
   */
  createPreset(config: Omit<PresetConfig, 'id' | 'metadata'>): PresetConfig {
    const id = this.generatePresetId();
    const preset: PresetConfig = {
      ...config,
      id,
      metadata: {
        created: getCurrentTimestamp(),
        lastUsed: 0,
        usageCount: 0,
        successRate: 0
      }
    };

    this.presets.set(id, preset);
    this.presetStats.set(id, {
      totalQuotes: 0,
      successfulFills: 0,
      averageExecutionTime: 0,
      averagePriceImprovement: 0,
      userSatisfaction: 0
    });

    console.log('✅ Preset created:', preset.name);
    return preset;
  }

  /**
   * Update existing preset
   */
  updatePreset(id: string, updates: Partial<PresetConfig>): PresetConfig | null {
    const preset = this.presets.get(id);
    if (!preset) {
      return null;
    }

    const updatedPreset = { ...preset, ...updates };
    this.presets.set(id, updatedPreset);
    
    console.log('🔄 Preset updated:', updatedPreset.name);
    return updatedPreset;
  }

  /**
   * Delete preset
   */
  deletePreset(id: string): boolean {
    const deleted = this.presets.delete(id);
    if (deleted) {
      this.presetStats.delete(id);
      console.log('🗑️ Preset deleted:', id);
    }
    return deleted;
  }

  /**
   * Get recommended preset for parameters
   */
  getRecommendedPreset(
    amount: string,
    fromChain: string,
    toChain: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): PresetConfig | null {
    const suitablePresets = this.getSuitablePresets(amount, fromChain, toChain);
    
    if (suitablePresets.length === 0) {
      return this.getPreset('medium');
    }

    // Sort by success rate and urgency compatibility
    const scored = suitablePresets.map(preset => ({
      preset,
      score: this.calculatePresetScore(preset, urgency)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].preset;
  }

  /**
   * Get auction configuration from preset
   */
  getAuctionConfig(presetId: string, customStartTime?: number): any {
    const preset = this.presets.get(presetId);
    if (!preset) {
      return null;
    }

    // Get current gas price recommendation
    const gasRecommendation = gasPriceTracker.getAuctionGasRecommendation(preset.auctionDuration);
    
    return {
      startTime: customStartTime || getCurrentTimestamp() + 5,
      auctionDuration: preset.auctionDuration,
      initialRateBump: preset.initialRateBump,
      points: preset.points,
      gasCost: {
        gasBumpEstimate: preset.gasCost.gasBumpEstimate,
        gasPriceEstimate: gasRecommendation.averageGasPrice
      }
    };
  }

  /**
   * Record preset usage
   */
  recordPresetUsage(presetId: string, executionTime: number, success: boolean): void {
    const preset = this.presets.get(presetId);
    const stats = this.presetStats.get(presetId);
    
    if (!preset || !stats) {
      return;
    }

    // Update preset metadata
    preset.metadata.lastUsed = getCurrentTimestamp();
    preset.metadata.usageCount++;
    
    // Update stats
    stats.totalQuotes++;
    if (success) {
      stats.successfulFills++;
    }
    
    // Update averages
    stats.averageExecutionTime = (stats.averageExecutionTime * (stats.totalQuotes - 1) + executionTime) / stats.totalQuotes;
    preset.metadata.successRate = stats.successfulFills / stats.totalQuotes;
    
    console.log(`📊 Preset ${preset.name} usage recorded`);
  }

  /**
   * Get preset statistics
   */
  getPresetStats(presetId: string): PresetStats | null {
    return this.presetStats.get(presetId) || null;
  }

  /**
   * Get all preset statistics
   */
  getAllPresetStats(): Map<string, PresetStats> {
    return new Map(this.presetStats);
  }

  /**
   * Optimize presets based on usage data
   */
  optimizePresets(): void {
    console.log('🔧 Optimizing presets based on usage data...');
    
    for (const [presetId, stats] of this.presetStats) {
      const preset = this.presets.get(presetId);
      if (!preset || stats.totalQuotes < 10) {
        continue;
      }

      // Auto-adjust based on success rate
      if (stats.successfulFills / stats.totalQuotes < 0.7) {
        // Decrease rate bump if success rate is low
        preset.initialRateBump = Math.max(200, preset.initialRateBump - 50);
      } else if (stats.successfulFills / stats.totalQuotes > 0.9) {
        // Increase rate bump if success rate is too high (might be leaving money on table)
        preset.initialRateBump = Math.min(1500, preset.initialRateBump + 25);
      }

      // Adjust auction duration based on average execution time
      if (stats.averageExecutionTime < preset.auctionDuration * 0.3) {
        // Reduce duration if most auctions fill quickly
        preset.auctionDuration = Math.max(60, preset.auctionDuration - 30);
      } else if (stats.averageExecutionTime > preset.auctionDuration * 0.8) {
        // Increase duration if auctions are taking too long
        preset.auctionDuration = Math.min(600, preset.auctionDuration + 30);
      }

      console.log(`🔧 Optimized preset ${preset.name}`);
    }
  }

  /**
   * Generate unique preset ID
   */
  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default presets
   */
  private initializeDefaultPresets(): void {
    // Fast preset
    this.createPreset({
      name: 'fast',
      description: 'Quick execution with higher rate bump',
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
      },
      conditions: {
        minAmount: "1000000000000000", // 0.001 ETH - Daha düşük minimum
        supportedChains: ['ethereum', 'polygon', 'bsc']
      }
    });

    // Medium preset
    this.createPreset({
      name: 'medium',
      description: 'Balanced execution time and rate',
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
      },
      conditions: {
        minAmount: "1000000000000000", // 0.001 ETH - Daha düşük minimum
        supportedChains: ['ethereum', 'polygon', 'bsc', 'stellar']
      }
    });

    // Slow preset
    this.createPreset({
      name: 'slow',
      description: 'Patient execution for best rates',
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
      },
      conditions: {
        minAmount: "1000000000000000", // 0.001 ETH - Daha düşük minimum
        supportedChains: ['ethereum', 'polygon', 'bsc', 'stellar', 'arbitrum']
      }
    });

    // High-value preset
    this.createPreset({
      name: 'high-value',
      description: 'Optimized for large transactions',
      auctionDuration: 240,
      initialRateBump: 300,
      points: [
        { delay: 24, coefficient: 200 },
        { delay: 48, coefficient: 150 },
        { delay: 96, coefficient: 100 },
        { delay: 144, coefficient: 50 }
      ],
      gasCost: {
        gasBumpEstimate: 50,
        gasPriceEstimate: "25"
      },
      conditions: {
        minAmount: "10000000000000000000", // 10 ETH
        supportedChains: ['ethereum', 'polygon']
      }
    });

    // Low-gas preset
    this.createPreset({
      name: 'low-gas',
      description: 'Optimized for low gas price conditions',
      auctionDuration: 360,
      initialRateBump: 400,
      points: [
        { delay: 36, coefficient: 200 },
        { delay: 72, coefficient: 150 },
        { delay: 144, coefficient: 100 },
        { delay: 216, coefficient: 50 }
      ],
      gasCost: {
        gasBumpEstimate: 30,
        gasPriceEstimate: "10"
      },
      conditions: {
        minAmount: "1000000000000000", // 0.001 ETH
        supportedChains: ['ethereum', 'polygon', 'bsc', 'stellar', 'arbitrum']
      }
    });

    console.log('✅ Default presets initialized');
  }

  /**
   * Get suitable presets for given parameters
   */
  private getSuitablePresets(amount: string, fromChain: string, toChain: string): PresetConfig[] {
    const amountBigInt = BigInt(amount);
    const suitable: PresetConfig[] = [];

    for (const preset of this.presets.values()) {
      // Check amount constraints
      if (preset.conditions.minAmount && amountBigInt < BigInt(preset.conditions.minAmount)) {
        continue;
      }
      if (preset.conditions.maxAmount && amountBigInt > BigInt(preset.conditions.maxAmount)) {
        continue;
      }

      // Check chain support
      if (preset.conditions.supportedChains) {
        const supportedChains = preset.conditions.supportedChains;
        if (!supportedChains.includes(fromChain) || !supportedChains.includes(toChain)) {
          continue;
        }
      }

      suitable.push(preset);
    }

    return suitable;
  }

  /**
   * Calculate preset score for recommendation
   */
  private calculatePresetScore(preset: PresetConfig, urgency: 'low' | 'medium' | 'high'): number {
    let score = 0;

    // Base score from success rate
    score += preset.metadata.successRate * 50;

    // Usage count bonus (popular presets)
    score += Math.min(preset.metadata.usageCount / 100, 1) * 20;

    // Urgency compatibility
    if (urgency === 'high' && preset.auctionDuration <= 120) {
      score += 20;
    } else if (urgency === 'medium' && preset.auctionDuration <= 180) {
      score += 15;
    } else if (urgency === 'low' && preset.auctionDuration >= 240) {
      score += 10;
    }

    // Recent usage bonus
    const daysSinceLastUsed = (getCurrentTimestamp() - preset.metadata.lastUsed) / (24 * 60 * 60);
    if (daysSinceLastUsed < 7) {
      score += 10;
    }

    return score;
  }

  /**
   * Export presets configuration
   */
  exportPresets(): { presets: PresetConfig[], stats: Map<string, PresetStats> } {
    return {
      presets: Array.from(this.presets.values()),
      stats: new Map(this.presetStats)
    };
  }

  /**
   * Import presets configuration
   */
  importPresets(data: { presets: PresetConfig[], stats: Map<string, PresetStats> }): void {
    this.presets.clear();
    this.presetStats.clear();

    for (const preset of data.presets) {
      this.presets.set(preset.id, preset);
    }

    for (const [id, stats] of data.stats) {
      this.presetStats.set(id, stats);
    }

    console.log('✅ Presets imported successfully');
  }
}

// Singleton instance
export const presetManager = new PresetManager();

export default PresetManager; 