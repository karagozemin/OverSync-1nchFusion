import { useState, useEffect } from 'react';
import { getCurrentNetwork, getContractAddresses, isTestnet } from '../config/networks';

interface BridgeFormProps {
  ethAddress: string;
  stellarAddress: string;
}

// Sabit token bilgileri
const ETH_TOKEN = {
  symbol: 'ETH',
  name: 'Ethereum',
  logo: '/images/eth.png',
  chain: 'Ethereum',
  decimals: 18
};

const XLM_TOKEN = {
  symbol: 'XLM',
  name: 'Stellar Lumens',
  logo: '/images/xlm.png',
  chain: 'Stellar',
  decimals: 7
};

// Sabit kur oranı (gerçek uygulamada API'den alınacak)
const ETH_TO_XLM_RATE = 10000; // 1 ETH = 10,000 XLM

export default function BridgeForm({ ethAddress, stellarAddress }: BridgeFormProps) {
  const [direction, setDirection] = useState<'eth_to_xlm' | 'xlm_to_eth'>('eth_to_xlm');
  const [amount, setAmount] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // From ve To tokenları
  const fromToken = direction === 'eth_to_xlm' ? ETH_TOKEN : XLM_TOKEN;
  const toToken = direction === 'eth_to_xlm' ? XLM_TOKEN : ETH_TOKEN;
  
  // Miktar değiştiğinde karşılık gelen tutarı hesapla
  useEffect(() => {
    if (!amount || isNaN(parseFloat(amount))) {
      setEstimatedAmount('');
      return;
    }
    
    const sourceAmount = parseFloat(amount);
    let targetAmount: number;
    
    if (direction === 'eth_to_xlm') {
      targetAmount = sourceAmount * ETH_TO_XLM_RATE;
    } else {
      targetAmount = sourceAmount / ETH_TO_XLM_RATE;
    }
    
    setEstimatedAmount(targetAmount.toFixed(toToken.decimals > 6 ? 6 : toToken.decimals));
  }, [amount, direction, toToken.decimals]);
  
  // Yön değiştirme
  const handleSwapDirection = () => {
    setDirection(prev => prev === 'eth_to_xlm' ? 'xlm_to_eth' : 'eth_to_xlm');
    setAmount('');
    setEstimatedAmount('');
  };

  // Form gönderimi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !ethAddress || !stellarAddress) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Burada gerçek API çağrısı yapılacak
      // Şimdilik mock bir işlem simüle ediyoruz
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock order ID
      const mockOrderId = `0x${Math.random().toString(16).substring(2, 10)}`;
      setOrderId(mockOrderId);
      setOrderCreated(true);
      
      console.log('Order created:', {
        fromToken,
        toToken,
        amount,
        estimatedAmount,
        ethAddress,
        stellarAddress,
        direction
      });
      
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form sıfırlama
  const handleReset = () => {
    setAmount('');
    setEstimatedAmount('');
    setOrderCreated(false);
    setOrderId(null);
  };

  // Cüzdanlar bağlı mı kontrol et
  const walletsConnected = ethAddress && stellarAddress;

  return (
    <div className="w-full max-w-md rounded-2xl p-6 bg-[#131823] flowing-border">
      {orderCreated ? (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Order Created!</h3>
            <p className="text-gray-300">
              Your cross-chain order has been successfully created and is now processing.
            </p>
          </div>
          
          <div className="bg-[#1a212f] rounded-lg p-4 text-left border border-white/5">
            <div className="mb-2">
              <span className="text-sm text-gray-400">Order ID:</span>
              <p className="font-mono text-white">{orderId}</p>
            </div>
            <div className="mb-2">
              <span className="text-sm text-gray-400">From:</span>
              <p className="text-white">{amount} {fromToken.symbol}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">To:</span>
              <p className="text-white">{estimatedAmount} {toToken.symbol}</p>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              onClick={handleReset}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              New Swap
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-white">Swap</h2>
            <div className="flex items-center gap-2">
              <button type="button" className="p-1.5 rounded-md hover:bg-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button type="button" className="p-1.5 rounded-md hover:bg-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* From Section */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">You pay</label>
            <div className="bg-[#1a212f] rounded-lg p-4 border border-white/5 input-container">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={fromToken.logo} 
                    alt={fromToken.symbol} 
                    className="w-6 h-6"
                  />
                  <div>
                    <span className="font-medium text-white">{fromToken.symbol}</span>
                    <span className="text-xs text-gray-400 ml-2">on {fromToken.chain}</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl font-medium text-white outline-none"
                />
                <div className="text-sm text-gray-400 mt-1">
                  $0.00
                </div>
              </div>
            </div>
          </div>
          
          {/* Swap Direction Button */}
          <div className="flex justify-center -my-2 z-10 relative">
            <button
              type="button"
              onClick={handleSwapDirection}
              className="bg-[#1a212f] p-2 rounded-full hover:bg-[#252b3b] transition-colors border border-white/5 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
          
          {/* To Section */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">You receive</label>
            <div className="bg-[#1a212f] rounded-lg p-4 border border-white/5 input-container">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={toToken.logo} 
                    alt={toToken.symbol} 
                    className="w-6 h-6"
                  />
                  <div>
                    <span className="font-medium text-white">{toToken.symbol}</span>
                    <span className="text-xs text-gray-400 ml-2">on {toToken.chain}</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="text-2xl font-medium text-white">
                  {estimatedAmount || '0.0'}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  $0.00
                </div>
              </div>
            </div>
          </div>
          
          {/* Fee and Time Estimate */}
          <div className="flex justify-between items-center text-sm text-gray-400 px-1">
            <div>Fee: $0.00</div>
            <div>~1 min</div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !amount || !walletsConnected}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              walletsConnected 
                ? 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 text-white' 
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-white/5'
            }`}
          >
            {!walletsConnected 
              ? 'Connect Wallet' 
              : isSubmitting 
                ? 'Processing...' 
                : 'Swap'
            }
          </button>
        </form>
      )}
    </div>
  );
} 