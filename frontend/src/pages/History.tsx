import { useState, useEffect } from 'react';
import { useFreighter } from '../hooks/useFreighter';

// Order tipi
interface Order {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  expiresAt: string;
  sourceChain: string;
  targetChain: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: string;
  targetAmount: string;
  maker: string;
  resolver?: string;
}

export default function History() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  
  const { address: stellarAddress, isConnected: stellarConnected } = useFreighter();
  const [ethAddress, setEthAddress] = useState<string>('');

  // MetaMask bağlantısını kontrol et
  useEffect(() => {
    const checkEthConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        setEthAddress(window.ethereum.selectedAddress);
      }
    };
    
    checkEthConnection();
  }, []);

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

  // Order geçmişini yükle
  useEffect(() => {
    const loadOrders = async () => {
      if (!ethAddress && !stellarConnected) {
        setOrders([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Burada gerçek API çağrısı yapılacak
        // Şimdilik mock data kullanıyoruz
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated API delay
        
        const mockOrders: Order[] = [
          {
            id: '0x1234abcd5678ef90',
            status: 'COMPLETED',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
            expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
            sourceChain: 'Ethereum',
            targetChain: 'Stellar',
            sourceAsset: 'ETH',
            targetAsset: 'XLM',
            sourceAmount: '1.5',
            targetAmount: '15000',
            maker: ethAddress || '0xabcd...1234',
            resolver: '0x7890...5678'
          },
          {
            id: '0x5678ef901234abcd',
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
            sourceChain: 'Stellar',
            targetChain: 'Ethereum',
            sourceAsset: 'XLM',
            targetAsset: 'USDC',
            sourceAmount: '10000',
            targetAmount: '100',
            maker: stellarAddress || 'GABCD...1234',
            resolver: '0x7890...5678'
          },
          {
            id: '0x90abcdef56781234',
            status: 'EXPIRED',
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
            expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            sourceChain: 'Ethereum',
            targetChain: 'Stellar',
            sourceAsset: 'USDC',
            targetAsset: 'yXLM',
            sourceAmount: '500',
            targetAmount: '4950',
            maker: ethAddress || '0xabcd...1234',
            resolver: undefined
          },
          {
            id: '0xdef1234567890abc',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
            sourceChain: 'Ethereum',
            targetChain: 'Stellar',
            sourceAsset: 'ETH',
            targetAsset: 'XLM',
            sourceAmount: '0.5',
            targetAmount: '5000',
            maker: ethAddress || '0xabcd...1234',
            resolver: undefined
          }
        ];
        
        setOrders(mockOrders);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load order history');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrders();
  }, [ethAddress, stellarConnected, stellarAddress]);

  // Filtrelenmiş order'lar
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['PENDING', 'ACTIVE'].includes(order.status);
    if (filter === 'completed') return order.status === 'COMPLETED';
    if (filter === 'expired') return ['EXPIRED', 'FAILED', 'REFUNDED'].includes(order.status);
    return true;
  });

  // Order status badge
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">Pending</span>;
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">Active</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">Completed</span>;
      case 'EXPIRED':
        return <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">Expired</span>;
      case 'FAILED':
        return <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">Failed</span>;
      case 'REFUNDED':
        return <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">Refunded</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full border border-gray-500/30">Unknown</span>;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            Order History
          </span>
        </h1>
        <p className="text-lg text-gray-300 mb-2 max-w-2xl mx-auto">
          View and manage your cross-chain orders
        </p>
      </div>

      {/* Connect Wallets Notice */}
      {(!ethAddress && !stellarConnected) && (
        <div className="w-full max-w-4xl bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            Please connect at least one wallet to view your order history.
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

      {/* History Table */}
      <div className="w-full max-w-4xl">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'all' 
                ? 'bg-white/10 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'active' 
                ? 'bg-white/10 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'completed' 
                ? 'bg-white/10 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'expired' 
                ? 'bg-white/10 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Expired/Failed
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-lg text-center">
            <p className="text-red-300">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 text-center">
            <p className="text-gray-400">No orders found</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg text-sm"
            >
              Create New Order
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                        {order.id.substring(0, 8)}...{order.id.substring(order.id.length - 4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center gap-1.5">
                          {order.sourceChain === 'Ethereum' ? (
                            <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
                              <span className="text-[10px] text-blue-300">E</span>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-purple-500/30 flex items-center justify-center">
                              <span className="text-[10px] text-purple-300">S</span>
                            </div>
                          )}
                          <span>{order.sourceAmount} {order.sourceAsset}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center gap-1.5">
                          {order.targetChain === 'Ethereum' ? (
                            <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
                              <span className="text-[10px] text-blue-300">E</span>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-purple-500/30 flex items-center justify-center">
                              <span className="text-[10px] text-purple-300">S</span>
                            </div>
                          )}
                          <span>{order.targetAmount} {order.targetAsset}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors">
                            Details
                          </button>
                          {['EXPIRED', 'FAILED'].includes(order.status) && (
                            <button 
                              onClick={() => window.location.href = '/recovery'}
                              className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded hover:bg-orange-500/30 transition-colors"
                            >
                              Recover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 