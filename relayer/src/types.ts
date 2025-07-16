/**
 * @fileoverview Shared types for FusionBridge API
 * @description 1inch Fusion+ compatible interfaces and types
 */

// Quote Request/Response Types
export interface QuoteRequest {
  srcChain: number;
  dstChain: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  walletAddress: string;
  enableEstimate?: boolean;
  fee?: number;
  isPermit2?: string;
  permit?: string;
}

export interface AuctionPoint {
  delay: number;
  coefficient: number;
}

export interface GasCostConfig {
  gasBumpEstimate: number;
  gasPriceEstimate: string;
}

export interface Preset {
  auctionDuration: number;
  startAuctionIn: number;
  initialRateBump: number;
  auctionStartAmount: string;
  startAmount: string;
  auctionEndAmount: string;
  exclusiveResolver?: string | null;
  costInDstToken: string;
  points: AuctionPoint[];
  allowPartialFills: boolean;
  allowMultipleFills: boolean;
  gasCost: GasCostConfig;
  secretsCount: number;
}

export interface QuoteResponse {
  quoteId: string;
  srcTokenAmount: string;
  dstTokenAmount: string;
  presets: {
    fast: Preset;
    medium: Preset;
    slow: Preset;
    custom?: Preset;
  };
  srcEscrowFactory: string;
  dstEscrowFactory: string;
  whitelist: string[];
  timeLocks: TimeLocks;
  srcSafetyDeposit: string;
  dstSafetyDeposit: string;
  recommendedPreset: 'fast' | 'medium' | 'slow' | 'custom';
  prices: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
  volume: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
}

// Order Types
export interface OrderInput {
  salt: string;
  makerAsset: string;
  takerAsset: string;
  maker: string;
  receiver: string;
  makingAmount: string;
  takingAmount: string;
  makerTraits: string;
}

export interface SignedOrderInput {
  order: OrderInput;
  srcChainId: number;
  signature: string;
  extension: string;
  quoteId: string;
  secretHashes?: string[];
}

export interface ActiveOrder {
  orderHash: string;
  signature: string;
  deadline: number;
  auctionStartDate: number;
  auctionEndDate: number;
  quoteId: string;
  remainingMakerAmount: string;
  makerBalance: string;
  makerAllowance: string;
  isMakerContract: boolean;
  extension: string;
  srcChainId: number;
  dstChainId: number;
  order: OrderInput;
}

export interface TimeLocks {
  srcWithdrawal: number;
  srcPublicWithdrawal: number;
  srcCancellation: number;
  srcPublicCancellation: number;
  dstWithdrawal: number;
  dstPublicWithdrawal: number;
  dstCancellation: number;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedResponse<T> {
  meta: PaginationMeta;
  items: T[];
}

// Secret Management Types
export interface SecretInput {
  secret: string;
  orderHash: string;
}

export interface PublicSecret {
  idx: number;
  secret: string;
}

export interface Immutables {
  orderHash: string;
  hashlock: string;
  maker: string;
  taker: string;
  token: string;
  amount: string;
  safetyDeposit: string;
  timelocks: string;
}

export interface ResolverDataOutput {
  orderType: 'SingleFill' | 'MultipleFills';
  secrets: PublicSecret[];
  srcImmutables: Immutables;
  dstImmutables: Immutables;
  secretHashes: string[];
}

// Error Types
export interface APIError {
  error: string;
  message?: string;
  code?: number;
}

// Success Response Types
export interface SuccessResponse {
  success: boolean;
  message?: string;
} 