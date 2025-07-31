import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  txHash: string;
  fromNetwork: string;
  toNetwork: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedAmount: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  timestamp: number;
  ethTxHash?: string;
  stellarTxHash?: string;
  direction: 'eth-to-xlm' | 'xlm-to-eth';
}

interface TransactionHistoryProps {
  ethAddress?: string;
  stellarAddress?: string;
}

export default function TransactionHistory({ ethAddress, stellarAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Mock transaction data for demo
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        txHash: '0x1234567890abcdef1234567890abcdef12345678',
        fromNetwork: 'ETH Sepolia',
        toNetwork: 'Stellar Testnet',
        fromToken: 'ETH',
        toToken: 'XLM',
        amount: '0.001',
        estimatedAmount: '10.00',
        status: 'completed',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        ethTxHash: '0x1234567890abcdef1234567890abcdef12345678',
        stellarTxHash: 'abcd1234567890abcdef1234567890abcdef123456789',
        direction: 'eth-to-xlm'
      },
      {
        id: '2', 
        txHash: 'stellar_tx_abcd1234567890abcdef1234567890abcdef',
        fromNetwork: 'Stellar Testnet',
        toNetwork: 'ETH Sepolia',
        fromToken: 'XLM',
        toToken: 'ETH',
        amount: '100.00',
        estimatedAmount: '0.01',
        status: 'pending',
        timestamp: Date.now() - 600000, // 10 minutes ago
        stellarTxHash: 'stellar_tx_abcd1234567890abcdef1234567890abcdef',
        direction: 'xlm-to-eth'
      },
      {
        id: '3',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
        fromNetwork: 'ETH Sepolia',
        toNetwork: 'Stellar Testnet',
        fromToken: 'ETH',
        toToken: 'XLM',
        amount: '0.005',
        estimatedAmount: '50.00',
        status: 'failed',
        timestamp: Date.now() - 3600000, // 1 hour ago
        ethTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
        direction: 'eth-to-xlm'
      },
      {
        id: '4',
        txHash: '0x9876543210fedcba9876543210fedcba98765432',
        fromNetwork: 'ETH Sepolia',  
        toNetwork: 'Stellar Testnet',
        fromToken: 'ETH',
        toToken: 'XLM',
        amount: '0.002',
        estimatedAmount: '20.00',
        status: 'cancelled',
        timestamp: Date.now() - 7200000, // 2 hours ago
        ethTxHash: '0x9876543210fedcba9876543210fedcba98765432',
        direction: 'eth-to-xlm'
      }
    ];

    // Try to get real transactions from localStorage first
    const savedTransactions = localStorage.getItem('bridge_transactions');
    if (savedTransactions) {
      try {
        const realTransactions = JSON.parse(savedTransactions);
        console.log('📊 Found real transactions in localStorage:', realTransactions);
        
        // Combine real and mock transactions
        const allTransactions = [...realTransactions, ...mockTransactions];
        setTransactions(allTransactions);
      } catch (error) {
        console.log('❌ Error reading localStorage transactions:', error);
        setTransactions(mockTransactions);
      }
    } else {
      console.log('📊 No real transactions found, using mock data');
      setTransactions(mockTransactions);
    }
    
    // Note: Removed automatic API call since API endpoint has issues
    // Refresh button now only refreshes from localStorage
  }, [ethAddress, stellarAddress]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Refreshing transactions from localStorage only...');
      
      // Get fresh data from localStorage
      const savedTransactions = localStorage.getItem('bridge_transactions');
      if (savedTransactions) {
        const realTransactions = JSON.parse(savedTransactions);
        console.log('✅ Refreshed transactions from localStorage:', realTransactions.length, 'transactions');
        
        // Combine with mock data
        const mockTransactions: Transaction[] = [
          {
            id: 'mock1',
            txHash: '0x1234567890abcdef1234567890abcdef12345678',
            fromNetwork: 'ETH Sepolia',
            toNetwork: 'Stellar Testnet',
            fromToken: 'ETH',
            toToken: 'XLM',
            amount: '0.001',
            estimatedAmount: '10.00',
            status: 'completed',
            timestamp: Date.now() - 1800000,
            ethTxHash: '0x1234567890abcdef1234567890abcdef12345678',
            stellarTxHash: 'abcd1234567890abcdef1234567890abcdef123456789',
            direction: 'eth-to-xlm'
          }
        ];
        
        const allTransactions = [...realTransactions, ...mockTransactions];
        setTransactions(allTransactions);
      } else {
        console.log('📊 No real transactions found in localStorage');
      }
    } catch (error) {
      console.log('❌ Failed to refresh from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'cancelled':
        return 'text-gray-400 bg-gray-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.status === filter
  );

  const openEtherscan = (txHash: string) => {
    window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank');
  };

  const openStellarExplorer = (txHash: string) => {
    window.open(`https://stellar.expert/explorer/testnet/tx/${txHash}`, '_blank');
  };

  return (
    <div className="bg-[#131823] rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Transaction History</h2>
          <p className="text-gray-400 text-sm">
            Track your cross-chain swaps between ETH Sepolia and Stellar Testnet
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {label} {key !== 'all' && `(${transactions.filter(tx => tx.status === key).length})`}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-lg">No transactions found</p>
            <p className="text-gray-500 text-sm mt-1">
              Your cross-chain swaps will appear here
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-[#1a212f] rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {getStatusIcon(tx.status)}
                    <span className="capitalize">{tx.status}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(tx.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {tx.ethTxHash && (
                    <button
                      onClick={() => openEtherscan(tx.ethTxHash!)}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      title="View on Etherscan"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  {tx.stellarTxHash && (
                    <button
                      onClick={() => openStellarExplorer(tx.stellarTxHash!)}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      title="View on Stellar Explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-white font-medium">
                      {tx.amount} {tx.fromToken}
                    </div>
                    <div className="text-xs text-gray-400">
                      {tx.fromNetwork}
                    </div>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  
                  <div className="text-center">
                    <div className="text-white font-medium">
                      {tx.estimatedAmount} {tx.toToken}
                    </div>
                    <div className="text-xs text-gray-400">
                      {tx.toNetwork}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-xs text-gray-400">
                  Transaction: 
                  <span className="text-gray-300 font-mono ml-1">
                    {tx.txHash.substring(0, 10)}...{tx.txHash.substring(tx.txHash.length - 8)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 