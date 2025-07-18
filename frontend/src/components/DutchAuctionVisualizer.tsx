import { useState, useEffect } from 'react';

interface DutchAuctionVisualizerProps {
  startPrice: number;
  endPrice: number;
  startTime: Date;
  endTime: Date;
  currentPrice?: number;
}

export default function DutchAuctionVisualizer({
  startPrice,
  endPrice,
  startTime,
  endTime,
  currentPrice,
}: DutchAuctionVisualizerProps) {
  const [now, setNow] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [price, setPrice] = useState(startPrice);

  // Her saniye güncellemek için
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // İlerleme ve fiyat hesaplama
  useEffect(() => {
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    
    // İlerleme yüzdesi (0-100)
    let progressValue = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    setProgress(progressValue);
    
    // Mevcut fiyat
    if (currentPrice !== undefined) {
      setPrice(currentPrice);
    } else {
      const priceDiff = startPrice - endPrice;
      const currentPriceValue = startPrice - (priceDiff * (progressValue / 100));
      setPrice(currentPriceValue);
    }
  }, [now, startPrice, endPrice, startTime, endTime, currentPrice]);

  // Kalan süre hesaplama
  const getRemainingTime = () => {
    const remaining = endTime.getTime() - now.getTime();
    if (remaining <= 0) return '00:00:00';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-300">Dutch Auction</h3>
        <span className="text-xs text-gray-400">Time remaining: {getRemainingTime()}</span>
      </div>
      
      {/* Price Display */}
      <div className="flex justify-center mb-4">
        <div className="text-2xl font-bold text-white">
          {price.toFixed(6)} ETH
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Price Range */}
      <div className="flex justify-between text-xs text-gray-400">
        <div>Start: {startPrice.toFixed(6)} ETH</div>
        <div>End: {endPrice.toFixed(6)} ETH</div>
      </div>
      
      {/* Time Range */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <div>{startTime.toLocaleTimeString()}</div>
        <div>{endTime.toLocaleTimeString()}</div>
      </div>
    </div>
  );
} 