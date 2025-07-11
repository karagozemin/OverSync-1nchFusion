import { useState } from 'react';

interface Token {
  symbol: string;
  name: string;
  icon: string;
  chain: string;
  chainIcon: string;
  price?: number; // USD fiyatı için
}



const TOKENS: Record<string, Token[]> = {
  ethereum: [
    { symbol: 'ETH', name: 'Ether', icon: '🔷', chain: 'Ethereum', chainIcon: '🔷', price: 2994.54 },
    { symbol: 'USDC', name: 'USD Coin', icon: '🔵', chain: 'Ethereum', chainIcon: '🔷', price: 1.00 },
    { symbol: 'USDT', name: 'Tether', icon: '🟢', chain: 'Ethereum', chainIcon: '🔷', price: 0.999 }
  ],
  stellar: [
    { symbol: 'XLM', name: 'Stellar Lumens', icon: '⭐', chain: 'Stellar', chainIcon: '⭐', price: 0.399 },
    { symbol: 'USDC', name: 'USD Coin', icon: '🔵', chain: 'Stellar', chainIcon: '⭐', price: 1.00 },
    { symbol: 'yXLM', name: 'yXLM', icon: '💎', chain: 'Stellar', chainIcon: '⭐', price: 0.385 }
  ]
};

export default function BridgeForm() {
  const [fromToken, setFromToken] = useState<Token>(TOKENS.ethereum[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS.stellar[0]);
  const [fromAmount, setFromAmount] = useState<string>('1');
  const [isConnected, setIsConnected] = useState(false);
  const [showFromTokens, setShowFromTokens] = useState(false);
  const [showToTokens, setShowToTokens] = useState(false);

  // Mock bakiye
  const mockBalance = 12.5047;

  // Dinamik döviz kuru hesaplama
  const calculateToAmount = () => {
    if (!fromAmount || isNaN(Number(fromAmount))) return '0';
    
    // Gerçek fiyatlara dayalı kur hesaplama
    const fromPrice = fromToken.price || 1;
    const toPrice = toToken.price || 1;
    const rate = fromPrice / toPrice;
    
    return (Number(fromAmount) * rate).toFixed(6);
  };

  // USD değer hesaplama
  const calculateUSDValue = (amount: string, token: Token) => {
    if (!amount || isNaN(Number(amount))) return 0;
    return Number(amount) * (token.price || 0);
  };

  // Yüzdelik butonlar için handler
  const handlePercentageClick = (percentage: number) => {
    const newAmount = (mockBalance * percentage / 100).toString();
    setFromAmount(newAmount);
  };

  const handleSwapDirection = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
  };

  // Token seçimi
  const handleFromTokenSelect = (token: Token) => {
    setFromToken(token);
    setShowFromTokens(false);
  };

  const handleToTokenSelect = (token: Token) => {
    setToToken(token);
    setShowToTokens(false);
  };

  // Kullanılabilir tokenları filtreleme
  const getAvailableTokens = (currentToken: Token) => {
    const allTokens = [...TOKENS.ethereum, ...TOKENS.stellar];
    return allTokens.filter(token => token.symbol !== currentToken.symbol);
  };

  return (
    <div className="w-full max-w-lg mx-auto relative z-10">
      {/* Main Swap Container */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 hover:shadow-3xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Swap</h2>
            <span className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/30">
              Beta
            </span>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 border border-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
            <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 border border-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* You Pay Section */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-3">You pay</label>
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <button 
                  onClick={() => setShowFromTokens(!showFromTokens)}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-xl px-4 py-3 transition-all duration-200 group border border-white/10 hover:border-white/20"
                >
                  <span className="text-2xl">{fromToken.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">
                      {fromToken.symbol}
                    </div>
                    <div className="text-xs text-gray-400">on {fromToken.chain}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 group-hover:text-white transition-colors">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>

                {/* Token Dropdown */}
                {showFromTokens && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {getAvailableTokens(fromToken).map((token) => (
                      <button
                        key={`${token.symbol}-${token.chain}`}
                        onClick={() => handleFromTokenSelect(token)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/10 last:border-b-0"
                      >
                        <span className="text-xl">{token.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-white">{token.symbol}</div>
                          <div className="text-xs text-gray-400">{token.name} on {token.chain}</div>
                        </div>
                        <div className="text-sm text-gray-300">${token.price?.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="bg-transparent text-right text-3xl font-bold text-white outline-none w-32 placeholder-gray-500"
                  placeholder="0.0"
                />
                <div className="text-gray-400 text-sm mt-1 font-medium">
                  ≈ ${calculateUSDValue(fromAmount, fromToken).toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {mockBalance} {fromToken.symbol}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handlePercentageClick(25)}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  25%
                </button>
                <button 
                  onClick={() => handlePercentageClick(50)}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  50%
                </button>
                <button 
                  onClick={() => handlePercentageClick(100)}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Max
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="relative flex justify-center my-6">
          <button
            onClick={handleSwapDirection}
            className="group relative p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-4 border-slate-800"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white group-hover:rotate-180 transition-transform duration-300">
              <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
            </svg>
          </button>
        </div>

        {/* You Receive Section */}
        <div className="mb-8">
          <label className="block text-gray-300 text-sm font-medium mb-3">You receive</label>
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <button 
                  onClick={() => setShowToTokens(!showToTokens)}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/15 rounded-xl px-4 py-3 transition-all duration-200 group border border-white/10 hover:border-white/20"
                >
                  <span className="text-2xl">{toToken.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">
                      {toToken.symbol}
                    </div>
                    <div className="text-xs text-gray-400">on {toToken.chain}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 group-hover:text-white transition-colors">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>

                {/* Token Dropdown */}
                {showToTokens && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {getAvailableTokens(toToken).map((token) => (
                      <button
                        key={`${token.symbol}-${token.chain}`}
                        onClick={() => handleToTokenSelect(token)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/10 last:border-b-0"
                      >
                        <span className="text-xl">{token.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-white">{token.symbol}</div>
                          <div className="text-xs text-gray-400">{token.name} on {token.chain}</div>
                        </div>
                        <div className="text-sm text-gray-300">${token.price?.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  {calculateToAmount()}
                </div>
                <div className="text-gray-400 text-sm mt-1 font-medium">
                  ≈ ${calculateUSDValue(calculateToAmount(), toToken).toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: 0.0000 {toToken.symbol}</span>
              <span className="text-green-400 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3l3.293 3.293-8.293 8.293-4.293-4.293 1.414-1.414 2.879 2.879 6.879-6.879z"/>
                </svg>
                {((calculateUSDValue(calculateToAmount(), toToken) / calculateUSDValue(fromAmount, fromToken) - 1) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6"></div>

        {/* Exchange Rate & Details */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Exchange Rate</span>
            <span className="text-white font-medium">
              1 {fromToken.symbol} = {(Number(calculateToAmount()) / Number(fromAmount || 1)).toFixed(6)} {toToken.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Network Fee</span>
            <span className="text-green-400 font-medium flex items-center gap-1">
              ⚡ Free
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Estimated Time</span>
            <span className="text-white font-medium">~2-5 minutes</span>
          </div>
        </div>

        {/* Main Action Button */}
        <button 
          onClick={() => setIsConnected(!isConnected)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white text-lg font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] mb-6"
        >
          {isConnected ? 'Swap Tokens' : 'Connect Wallet to Swap'}
        </button>

        {/* Wallet Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🦊</span>
              <span className="text-white font-semibold">MetaMask</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🚀</span>
              <span className="text-white font-semibold">Freighter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Card */}
      <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-2">Secure Cross-chain Bridge</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your assets are secured by Hash Time Locked Contracts (HTLC), ensuring trustless transfers between Ethereum and Stellar networks.
            </p>
          </div>
        </div>
      </div>

      {/* Dropdown kapatma için overlay */}
      {(showFromTokens || showToTokens) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowFromTokens(false);
            setShowToTokens(false);
          }}
        />
      )}
    </div>
  );
} 