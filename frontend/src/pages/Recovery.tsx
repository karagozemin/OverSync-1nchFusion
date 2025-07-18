import { useState } from 'react';
import { useFreighter } from '../hooks/useFreighter';

export default function Recovery() {
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<'search' | 'details' | 'confirm' | 'success'>('search');
  
  const { address: stellarAddress, isConnected: stellarConnected } = useFreighter();
  const [ethAddress, setEthAddress] = useState<string>('');

  // MetaMask bağlantısını kontrol et
  useState(() => {
    const checkEthConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        setEthAddress(window.ethereum.selectedAddress);
      }
    };
    
    checkEthConnection();
  });

  // MetaMask bağlantısı
  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask bulunamadı! Lütfen MetaMask yükleyin.');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setEthAddress(accounts[0]);
      }
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
    }
  };

  // Order arama
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Burada gerçek API çağrısı yapılacak
      // Şimdilik mock data kullanıyoruz
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated API delay
      
      if (orderId === 'not-found') {
        throw new Error('Order not found');
      }
      
      const mockOrderDetails = {
        id: orderId || '0x1234...abcd',
        status: 'EXPIRED',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        sourceChain: 'Ethereum',
        targetChain: 'Stellar',
        sourceAsset: 'ETH',
        targetAsset: 'XLM',
        sourceAmount: '1.5',
        targetAmount: '15000',
        maker: '0xabcd...1234',
        resolver: '0x7890...5678'
      };
      
      setOrderDetails(mockOrderDetails);
      setRecoveryStep('details');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery işlemi
  const handleRecovery = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Burada gerçek recovery işlemi yapılacak
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API delay
      
      setRecoveryStep('success');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Recovery failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Order Recovery
          </span>
        </h1>
        <p className="text-lg text-gray-300 mb-2 max-w-2xl mx-auto">
          Recover your expired or stuck cross-chain orders
        </p>
      </div>

      {/* Connect Wallets Notice */}
      {(!ethAddress || !stellarConnected) && (
        <div className="w-full max-w-md bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            Please connect both Ethereum and Stellar wallets to use the recovery tool.
          </p>
          <div className="flex gap-2 mt-2">
            {!ethAddress && (
              <button
                onClick={connectMetaMask}
                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-1.5 rounded-lg text-sm"
              >
                Connect MetaMask
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recovery Form */}
      <div className="w-full max-w-xl bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
        {recoveryStep === 'search' && (
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label htmlFor="orderId" className="block text-sm font-medium text-gray-300 mb-1">
                Order ID
              </label>
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter your order ID or transaction hash"
                className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter the order ID or transaction hash of the order you want to recover
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !orderId || (!ethAddress && !stellarConnected)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Searching...' : 'Search Order'}
            </button>
          </form>
        )}

        {recoveryStep === 'details' && orderDetails && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Order Details</h3>
              <span className="px-3 py-1 bg-red-500/20 text-red-300 text-sm rounded-full border border-red-500/30">
                {orderDetails.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Order ID</p>
                  <p className="text-sm text-white font-mono">{orderDetails.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Created</p>
                  <p className="text-sm text-white">{new Date(orderDetails.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Expired</p>
                  <p className="text-sm text-white">{new Date(orderDetails.expiresAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Source Chain</p>
                  <p className="text-sm text-white">{orderDetails.sourceChain}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Target Chain</p>
                  <p className="text-sm text-white">{orderDetails.targetChain}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Source Asset</p>
                  <p className="text-sm text-white">{orderDetails.sourceAmount} {orderDetails.sourceAsset}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Target Asset</p>
                  <p className="text-sm text-white">{orderDetails.targetAmount} {orderDetails.targetAsset}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-300 mb-4">
                  This order has expired and can be refunded to the original sender.
                </p>
                
                {error && (
                  <div className="p-3 mb-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setRecoveryStep('search')}
                    className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRecovery}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Recover Funds'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {recoveryStep === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Recovery Successful!</h3>
              <p className="text-gray-300">
                Your funds have been successfully recovered and returned to your wallet.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setRecoveryStep('search')}
                  className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
                >
                  Recover Another Order
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-2 rounded-lg font-semibold transition-all duration-200"
                >
                  Back to Bridge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 