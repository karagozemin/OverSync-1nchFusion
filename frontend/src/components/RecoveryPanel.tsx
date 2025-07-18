import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Clock, Shield, CheckCircle, XCircle } from 'lucide-react';

interface RecoveryOrder {
  id: string;
  orderId: string;
  fromToken: string;
  toToken: string;
  amount: string;
  status: 'timeout' | 'stuck' | 'failed' | 'recoverable' | 'recovered';
  timelock: number;
  createdAt: number;
  lastActivity: number;
  errorMessage?: string;
}

interface RecoveryPanelProps {
  ethAddress: string;
  stellarAddress: string;
  onRecoverySuccess?: (orderId: string) => void;
  onRecoveryError?: (orderId: string, error: string) => void;
}

export default function RecoveryPanel({ 
  ethAddress, 
  stellarAddress, 
  onRecoverySuccess,
  onRecoveryError 
}: RecoveryPanelProps) {
  const [orders, setOrders] = useState<RecoveryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RecoveryOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string>('');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockOrders: RecoveryOrder[] = [
      {
        id: '1',
        orderId: '0x1234...5678',
        fromToken: 'ETH',
        toToken: 'XLM',
        amount: '0.5',
        status: 'timeout',
        timelock: Date.now() - 3600000, // 1 hour ago
        createdAt: Date.now() - 7200000, // 2 hours ago
        lastActivity: Date.now() - 3600000,
        errorMessage: 'Transaction timed out after 1 hour'
      },
      {
        id: '2',
        orderId: '0xabcd...efgh',
        fromToken: 'XLM',
        toToken: 'ETH',
        amount: '1000',
        status: 'stuck',
        timelock: Date.now() + 1800000, // 30 minutes from now
        createdAt: Date.now() - 5400000, // 1.5 hours ago
        lastActivity: Date.now() - 1800000,
        errorMessage: 'No resolver response for 30 minutes'
      }
    ];
    setOrders(mockOrders);
  }, []);

  const fetchRecoveryOrders = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:3001/api/recovery/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recovery orders');
      }
      
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async (order: RecoveryOrder) => {
    setIsRecovering(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:3001/api/recovery/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.orderId,
          ethAddress,
          stellarAddress,
          recoveryType: order.status === 'timeout' ? 'timeout_refund' : 'emergency_refund'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Recovery failed');
      }
      
      await response.json();
      
      // Update order status
      setOrders(prev => prev.map(o => 
        o.id === order.id 
          ? { ...o, status: 'recovered' as const }
          : o
      ));
      
      onRecoverySuccess?.(order.orderId);
      setSelectedOrder(null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recovery failed';
      setError(errorMessage);
      onRecoveryError?.(order.orderId, errorMessage);
    } finally {
      setIsRecovering(false);
    }
  };

  const getStatusColor = (status: RecoveryOrder['status']) => {
    switch (status) {
      case 'timeout':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'stuck':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'failed':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'recoverable':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'recovered':
        return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: RecoveryOrder['status']) => {
    switch (status) {
      case 'timeout':
        return <Clock className="h-4 w-4" />;
      case 'stuck':
        return <AlertTriangle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'recoverable':
        return <RefreshCw className="h-4 w-4" />;
      case 'recovered':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  };

  const isRecoverable = (order: RecoveryOrder) => {
    const now = Date.now();
    return order.timelock < now && (order.status === 'timeout' || order.status === 'stuck');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recovery Center
            </h2>
          </div>
          <button
            onClick={fetchRecoveryOrders}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Recover stuck or timed-out transactions
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Error: {error}
              </span>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No orders need recovery at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {order.amount} {order.fromToken} → {order.toToken}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(order.lastActivity)}
                    </span>
                    {isRecoverable(order) && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                      >
                        Recover
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Order ID: {order.orderId}
                </div>
                
                {order.errorMessage && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {order.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recovery Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Recovery
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
                <span className="text-gray-900 dark:text-white font-mono">
                  {selectedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedOrder.amount} {selectedOrder.fromToken}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`capitalize ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                  <p className="font-medium">Recovery will:</p>
                  <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                    <li>Refund your tokens to the original address</li>
                    <li>Cancel the cross-chain order</li>
                    <li>May take 5-10 minutes to complete</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRecovery(selectedOrder)}
                disabled={isRecovering}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {isRecovering ? 'Recovering...' : 'Recover Funds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 