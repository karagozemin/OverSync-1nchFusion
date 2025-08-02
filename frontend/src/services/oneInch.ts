/**
 * 1inch Fusion Plus API Integration
 * Documentation: https://docs.1inch.io/docs/fusion-plus/introduction
 */

export interface OneInchEscrowInfo {
  chainId: number;
  escrowFactory: string;
  escrowImplementation: string;
  supported: boolean;
}

export interface OneInchOrderRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  slippage: number;
  preset?: string;
  fee?: {
    takeFee: number;
    feeRecipient: string;
  };
}

export interface OneInchOrderResponse {
  order: {
    salt: string;
    maker: string;
    receiver: string;
    makerAsset: string;
    takerAsset: string;
    makingAmount: string;
    takingAmount: string;
    makerTraits: string;
  };
  orderHash: string;
  quoteId: string;
}

const ONEINCH_API_BASE = 'https://api.1inch.dev/fusion-plus';
const API_KEY = (import.meta as any).env?.VITE_ONEINCH_API_KEY || 'YOUR_1INCH_API_KEY_HERE';

class OneInchService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = ONEINCH_API_BASE;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`1inch API Error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  /**
   * Get escrow factory information for a specific chain
   */
  async getEscrowInfo(chainId: number): Promise<OneInchEscrowInfo> {
    return this.request<OneInchEscrowInfo>(`/orders/v1.0/order/escrow?chainId=${chainId}`);
  }

  /**
   * Create a new order on 1inch Fusion Plus
   */
  async createOrder(orderRequest: OneInchOrderRequest): Promise<OneInchOrderResponse> {
    return this.request<OneInchOrderResponse>('/orders/v1.0/order', {
      method: 'POST',
      body: JSON.stringify(orderRequest),
    });
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderHash: string): Promise<any> {
    return this.request(`/orders/v1.0/order/${orderHash}`);
  }

  /**
   * Get available presets for a chain
   */
  async getPresets(chainId: number): Promise<any> {
    return this.request(`/presets/v1.0/${chainId}`);
  }

  /**
   * Get quote for token swap
   */
  async getQuote(
    chainId: number, 
    fromToken: string, 
    toToken: string, 
    amount: string
  ): Promise<any> {
    const params = new URLSearchParams({
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount: amount,
    });
    
    return this.request(`/quoter/v1.0/${chainId}/quote?${params}`);
  }
}

// Export singleton instance
export const oneInchService = new OneInchService();

// Export for testing with different API keys
export { OneInchService }; 