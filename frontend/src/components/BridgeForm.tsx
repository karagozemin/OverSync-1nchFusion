import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Props interface
interface BridgeFormProps {
  ethAddress: string;
  stellarAddress: string;
}

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
    { symbol: 'ETH', name: 'Ether', icon: '🔷', chain: 'Ethereum', chainIcon: '🔷', price: 2994.54 }
  ],
  stellar: [
    { symbol: 'XLM', name: 'Stellar Lumens', icon: '⭐', chain: 'Stellar', chainIcon: '⭐', price: 0.399 }
  ]
};

export default function BridgeForm({ ethAddress, stellarAddress }: BridgeFormProps) {
  const [fromToken, setFromToken] = useState<Token>(TOKENS.ethereum[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS.stellar[0]);
  const [fromAmount, setFromAmount] = useState<string>('1');
  const [amountError, setAmountError] = useState<string>('');
  
  // Bridge transaction states
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [bridgeError, setBridgeError] = useState<string>('');

  // Real ETH balance
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Get real ETH balance from MetaMask
  useEffect(() => {
    const getEthBalance = async () => {
      if (!ethAddress || !window.ethereum) return;
      
      setIsLoadingBalance(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(ethAddress);
        const balanceInEth = ethers.formatEther(balance);
        setEthBalance(parseFloat(balanceInEth).toFixed(4));
      } catch (error) {
        console.error('Error getting ETH balance:', error);
        setEthBalance('0.0000');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    getEthBalance();
  }, [ethAddress]);

  // Calculate balance for display
  const getCurrentBalance = () => {
    if (fromToken.symbol === 'ETH') {
      return ethBalance;
    }
    // For other tokens, you can add similar logic
    return '0.0000';
  };

  // Input validation function
  const validateAmount = (value: string): boolean => {
    // Only allow numbers and one decimal point
    const regex = /^[0-9]*\.?[0-9]*$/;
    return regex.test(value);
  };

  // Handle amount input change
  const handleAmountChange = (value: string) => {
    // Clear previous error
    setAmountError('');
    
    // Don't allow empty string or just decimal point
    if (value === '' || value === '.') {
      setFromAmount('');
      return;
    }
    
    // Validate input format (only numbers and decimal)
    if (!validateAmount(value)) {
      setAmountError('Sadece sayı girebilirsiniz');
      return;
    }
    
    // Check if amount is valid number
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setAmountError('Geçersiz miktar');
      return;
    }
    
    // Check if amount exceeds balance
    const currentBalance = parseFloat(getCurrentBalance());
    if (numValue > currentBalance) {
      setAmountError(`Maksimum ${currentBalance} ${fromToken.symbol} girebilirsiniz`);
      setFromAmount(value); // Still allow typing but show error
      return;
    }
    
    // If all validations pass
    setFromAmount(value);
  };

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
      const balance = parseFloat(getCurrentBalance());
      const newAmount = (balance * percentage / 100).toFixed(6);
      handleAmountChange(newAmount);
    };

  const handleSwapDirection = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
  };

  // Token seçimi kaldırıldı - sadece ETH ve XLM swap

  // Bridge işlemi
  const handleBridge = async () => {
    // Cüzdan kontrolü
    if (!ethAddress || !stellarAddress) {
      setBridgeError('Lütfen önce her iki cüzdanı da bağlayın! Sağ üstteki "Connect Wallet" butonunu kullanın. 🦊🚀');
      setTimeout(() => setBridgeError(''), 5000);
      return;
    }

    // Miktar kontrolü
    if (!fromAmount || Number(fromAmount) <= 0) {
      setBridgeError('Lütfen geçerli bir miktar girin!');
      setTimeout(() => setBridgeError(''), 5000);
      return;
    }

    // Balance kontrolü
    const currentBalance = parseFloat(getCurrentBalance());
    const amount = parseFloat(fromAmount);
    if (amount > currentBalance) {
      setBridgeError(`Yetersiz bakiye. Maksimum ${currentBalance} ${fromToken.symbol} gönderebilirsiniz`);
      setTimeout(() => setBridgeError(''), 5000);
      return;
    }
    
    // Validation error kontrolü
    if (amountError) {
      setBridgeError('Lütfen geçerli bir miktar girin');
      setTimeout(() => setBridgeError(''), 5000);
      return;
    }

    setIsBridging(true);
    setBridgeError('');
    setBridgeStatus('Bridge işlemi başlatılıyor... ⏳');

    try {
      const bridgeData = {
        fromToken: {
          symbol: fromToken.symbol,
          chain: fromToken.chain,
          address: fromToken.chain === 'Ethereum' ? ethAddress : stellarAddress
        },
        toToken: {
          symbol: toToken.symbol,
          chain: toToken.chain,
          address: toToken.chain === 'Ethereum' ? ethAddress : stellarAddress
        },
        amount: fromAmount,
        ethAddress,
        stellarAddress,
        timestamp: Date.now()
      };

      const response = await fetch('http://localhost:3001/create-htlc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bridgeData)
      });

      const result = await response.json();

      if (response.ok) {
        setBridgeStatus(`Bridge başarılı! 🎉 TX: ${result.transactionId || 'Pending'}`);
        // İsteğe bağlı: Form resetleme
        // setFromAmount('');
      } else {
        throw new Error(result.message || 'Bridge işlemi başarısız');
      }

    } catch (error: any) {
      setBridgeError(`Bridge hatası: ${error.message}`);
    } finally {
      setIsBridging(false);
      setTimeout(() => setBridgeStatus(''), 10000);
    }
  };

  // Cüzdan durumu kontrolü
  const isWalletsConnected = ethAddress && stellarAddress;
  const canBridge = isWalletsConnected && fromAmount && Number(fromAmount) > 0;

  return (
    <div className="w-full max-w-lg mx-auto relative z-10">
      {/* Main Swap Container */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 hover:shadow-3xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Bridge</h2>
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

        {/* Wallet Status Overview */}
        {(ethAddress || stellarAddress) && (
          <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Wallet Status:</span>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs">🦊</span>
                  <div className={`w-2 h-2 rounded-full ${ethAddress ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🚀</span>
                  <div className={`w-2 h-2 rounded-full ${stellarAddress ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {bridgeStatus && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
            <p className="text-green-300 text-sm font-medium">{bridgeStatus}</p>
          </div>
        )}

        {bridgeError && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-sm font-medium">{bridgeError}</p>
          </div>
        )}

        {/* You Pay Section */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-3">You send</label>
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                <span className="text-2xl">{fromToken.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-white text-lg">
                    {fromToken.symbol}
                  </div>
                  <div className="text-xs text-gray-400">on {fromToken.chain}</div>
                </div>
              </div>
              
              <div className="text-right">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className={`bg-transparent text-right text-3xl font-bold outline-none w-32 placeholder-gray-500 ${
                    amountError ? 'text-red-400' : 'text-white'
                  }`}
                  placeholder="0.0"
                />
                <div className="text-gray-400 text-sm mt-1 font-medium">
                  ≈ ${calculateUSDValue(fromAmount, fromToken).toFixed(2)}
                </div>
                {amountError && (
                  <div className="text-red-400 text-xs mt-1 font-medium">
                    {amountError}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">
                  Balance: {isLoadingBalance ? 'Loading...' : getCurrentBalance()} {fromToken.symbol}
                </span>
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
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                <span className="text-2xl">{toToken.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-white text-lg">
                    {toToken.symbol}
                  </div>
                  <div className="text-xs text-gray-400">on {toToken.chain}</div>
                </div>
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
            <span className="text-gray-400">Bridge Fee</span>
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
          onClick={handleBridge}
          disabled={!canBridge || isBridging}
          className={`w-full text-lg font-bold py-4 rounded-2xl shadow-xl transition-all duration-300 transform hover:scale-[1.02] mb-6 ${
            canBridge && !isBridging
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 hover:shadow-2xl text-white'
              : 'bg-gray-600 text-gray-300 cursor-not-allowed'
          }`}
        >
          {isBridging ? 'Bridging... ⏳' : 
           !isWalletsConnected ? 'Connect Wallets First' : 
           'Bridge Tokens 🌉'}
        </button>
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

      {/* Dropdown overlay kaldırıldı */}
    </div>
  );
} 