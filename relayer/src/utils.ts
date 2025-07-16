/**
 * @fileoverview Utility functions for FusionBridge API
 * @description Helper functions for quote generation, validation, and order processing
 */

import { createHash, randomBytes } from 'crypto';
import { QuoteRequest, OrderInput, TimeLocks } from './types.js';

/**
 * Generate a unique quote ID
 */
export function generateQuoteId(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `quote_${timestamp}_${random}`;
}

/**
 * Generate a unique order hash
 */
export function generateOrderHash(order: OrderInput, srcChainId: number): string {
  const data = JSON.stringify({
    ...order,
    srcChainId
  });
  return '0x' + createHash('sha256').update(data).digest('hex');
}

/**
 * Generate random salt for orders
 */
export function generateSalt(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate quote request parameters
 */
export function validateQuoteRequest(params: QuoteRequest): { valid: boolean; error?: string } {
  // Required fields
  const requiredFields: (keyof QuoteRequest)[] = [
    'srcChain', 'dstChain', 'srcTokenAddress', 
    'dstTokenAddress', 'amount', 'walletAddress'
  ];

  for (const field of requiredFields) {
    if (!params[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate chain IDs
  if (params.srcChain === params.dstChain) {
    return { valid: false, error: 'Source and destination chains must be different' };
  }

  // Validate amount
  try {
    const amount = BigInt(params.amount);
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }
  } catch {
    return { valid: false, error: 'Invalid amount format' };
  }

  // Validate addresses
  if (!isValidAddress(params.srcTokenAddress) || 
      !isValidAddress(params.dstTokenAddress) || 
      !isValidAddress(params.walletAddress)) {
    return { valid: false, error: 'Invalid address format' };
  }

  return { valid: true };
}

/**
 * Validate Ethereum/Stellar address format
 */
export function isValidAddress(address: string): boolean {
  // Ethereum address validation (0x + 40 hex chars)
  if (address.startsWith('0x') && address.length === 42) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  // Stellar address validation (G + 55 chars)
  if (address.startsWith('G') && address.length === 56) {
    return /^G[A-Z2-7]{55}$/.test(address);
  }
  
  return false;
}

/**
 * Calculate fee amount
 */
export function calculateFee(amount: string, feeRate: number): string {
  const amountBigInt = BigInt(amount);
  const fee = (amountBigInt * BigInt(feeRate)) / BigInt(10000); // fee rate in basis points
  return fee.toString();
}

/**
 * Calculate destination amount after fee
 */
export function calculateDestinationAmount(amount: string, feeRate: number): string {
  const amountBigInt = BigInt(amount);
  const fee = calculateFee(amount, feeRate);
  const feeBigInt = BigInt(fee);
  return (amountBigInt - feeBigInt).toString();
}

/**
 * Generate default time locks
 */
export function generateDefaultTimeLocks(): TimeLocks {
  return {
    srcWithdrawal: 20,
    srcPublicWithdrawal: 120,
    srcCancellation: 121,
    srcPublicCancellation: 122,
    dstWithdrawal: 24,
    dstPublicWithdrawal: 100,
    dstCancellation: 101
  };
}

/**
 * Format amount for display (with decimals)
 */
export function formatAmount(amount: string, decimals: number = 18): string {
  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const integer = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;
  
  if (remainder === 0n) {
    return integer.toString();
  }
  
  const decimal = remainder.toString().padStart(decimals, '0');
  return `${integer}.${decimal.replace(/0+$/, '')}`;
}

/**
 * Parse amount from display format
 */
export function parseAmount(amount: string, decimals: number = 18): string {
  const [integer, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0');
  const totalString = integer + paddedDecimal;
  return BigInt(totalString).toString();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, limit?: number): { page: number; limit: number; error?: string } {
  const validatedPage = Math.max(1, page || 1);
  const validatedLimit = Math.min(500, Math.max(1, limit || 100));
  
  if (limit && limit > 500) {
    return {
      page: validatedPage,
      limit: validatedLimit,
      error: 'Limit cannot exceed 500'
    };
  }
  
  return {
    page: validatedPage,
    limit: validatedLimit
  };
}

/**
 * Create error response
 */
export function createErrorResponse(error: string, message?: string, code?: number) {
  return {
    error,
    message,
    code
  };
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    message,
    ...data
  };
}

/**
 * Generate current timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Add time to current timestamp
 */
export function addTimeToTimestamp(seconds: number): number {
  return getCurrentTimestamp() + seconds;
} 