import { useState, useEffect } from 'react';
import { TrendingDown, Clock, DollarSign, Activity } from 'lucide-react';

interface DutchAuctionProps {
  initialPrice: number;
  endPrice: number;
  duration: number; // seconds
  startTime: number; // timestamp
  gasPrice: number;
  isActive?: boolean;
}

interface AuctionState {
  currentPrice: number;
  timeElapsed: number;
  timeRemaining: number;
  progress: number;
  priceDecay: number;
  isExpired: boolean;
}

export default function DutchAuction({
  initialPrice,
  endPrice,
  duration,
  startTime,
  gasPrice,
  isActive = false
}: DutchAuctionProps) {
  const [auctionState, setAuctionState] = useState<AuctionState>({
    currentPrice: initialPrice,
    timeElapsed: 0,
    timeRemaining: duration,
    progress: 0,
    priceDecay: 0,
    isExpired: false
  });

  // Calculate auction state
  useEffect(() => {
    const updateAuctionState = () => {
      const now = Date.now() / 1000;
      const timeElapsed = Math.max(0, now - startTime);
      const timeRemaining = Math.max(0, duration - timeElapsed);
      const progress = Math.min(1, timeElapsed / duration);
      const isExpired = timeRemaining <= 0;

      // Dutch auction price decay (exponential)
      const priceDecay = Math.pow(progress, 1.5);
      const currentPrice = initialPrice - (initialPrice - endPrice) * priceDecay;

      setAuctionState({
        currentPrice: Math.max(endPrice, currentPrice),
        timeElapsed,
        timeRemaining,
        progress,
        priceDecay,
        isExpired
      });
    };

    updateAuctionState();
    
    // Update every second when active
    const interval = isActive ? setInterval(updateAuctionState, 1000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [initialPrice, endPrice, duration, startTime, isActive]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(6);
  };

  const getStatusColor = () => {
    if (auctionState.isExpired) return 'text-red-500';
    if (auctionState.progress < 0.3) return 'text-green-500';
    if (auctionState.progress < 0.7) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getProgressColor = () => {
    if (auctionState.isExpired) return 'bg-red-500';
    if (auctionState.progress < 0.3) return 'bg-green-500';
    if (auctionState.progress < 0.7) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <TrendingDown className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-white">
            Dutch Auction
          </h3>
        </div>
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">
            {auctionState.isExpired ? 'Expired' : isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Current Price Display */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Current Price</span>
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-2xl font-bold text-white">
              {formatPrice(auctionState.currentPrice)}
            </span>
          </div>
        </div>
        
        {/* Price Range */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Start: ${formatPrice(initialPrice)}</span>
          <span>End: ${formatPrice(endPrice)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
          <span className="text-sm font-medium text-white">
            {Math.round(auctionState.progress * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${auctionState.progress * 100}%` }}
          />
        </div>
      </div>

      {/* Time Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
          </div>
          <span className="text-lg font-semibold text-white">
            {formatTime(auctionState.timeRemaining)}
          </span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Elapsed</span>
          </div>
          <span className="text-lg font-semibold text-white">
            {formatTime(auctionState.timeElapsed)}
          </span>
        </div>
      </div>

      {/* Additional Info */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Gas Price:</span>
          <span className="font-medium text-white">
            {gasPrice.toFixed(2)} gwei
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-gray-600 dark:text-gray-400">Price Decay:</span>
          <span className="font-medium text-white">
            {(auctionState.priceDecay * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Status Message */}
      {auctionState.isExpired && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            Auction has expired. Final price: ${formatPrice(auctionState.currentPrice)}
          </p>
        </div>
      )}
    </div>
  );
} 