import { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown, ArrowUpDown, Wallet, ExternalLink } from 'lucide-react';
import TokenSelector from './TokenSelector';
import { useFreighter } from '../hooks/useFreighter';
import { 
  Horizon, 
  Keypair, 
  Asset, 
  Operation, 
  TransactionBuilder, 
  Networks,
  Memo
} from '@stellar/stellar-sdk';

// Web3 imports for contract interaction
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      selectedAddress?: string;
    };
  }
}

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

// Contract ABI for HTLCBridge
const HTLC_BRIDGE_ABI = [
  "function createOrder(address token, uint256 amount, bytes32 hashLock, uint256 timelock, uint256 feeRate, address beneficiary, address refundAddress, uint256 destinationChainId, bytes32 stellarTxHash, bool partialFillEnabled) external payable returns (uint256 orderId)",
  "function getNextOrderId() external view returns (uint256)"
];

// Contract address from environment
const HTLC_CONTRACT_ADDRESS = (import.meta as any).env?.VITE_HTLC_CONTRACT_ADDRESS || '0x088370cBc9b5aB4Cd1f5ed21e621959f6f0b1C25';
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

export default function BridgeForm({ ethAddress, stellarAddress }: BridgeFormProps) {
  const [direction, setDirection] = useState<'eth_to_xlm' | 'xlm_to_eth'>('eth_to_xlm');
  const [amount, setAmount] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Freighter hook for Stellar transactions
  const { signTransaction } = useFreighter();

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

  // Form gönderimi - RELAYER API ÜZERİNDEN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !ethAddress || !stellarAddress) {
      return;
    }
    
    if (!window.ethereum) {
      alert('MetaMask not found! Please install MetaMask.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if connected to Sepolia
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added yet
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SEP',
                  decimals: 18
                }
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      console.log('🔄 Creating bridge order via Relayer API...');
      
      // Create order request to relayer
      const orderRequest = {
        fromChain: direction === 'eth_to_xlm' ? 'ethereum' : 'stellar',
        toChain: direction === 'eth_to_xlm' ? 'stellar' : 'ethereum',
        fromToken: direction === 'eth_to_xlm' ? 'ETH' : 'XLM',
        toToken: direction === 'eth_to_xlm' ? 'XLM' : 'ETH',
        amount: amount,
        ethAddress: ethAddress,
        stellarAddress: stellarAddress,
        direction: direction
      };
      
      // Send request to relayer
      const response = await fetch('http://localhost:3001/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRequest)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }
      
      const result = await response.json();
      console.log('✅ Order created via relayer:', result);
      
      // Handle different transaction types based on direction
      if (direction === 'eth_to_xlm' && result.approvalTransaction) {
        // ETH → XLM: Use MetaMask for ETH transaction
        console.log('🔄 Requesting ETH approval transaction...');
        console.log('📋 Instructions:', result.instructions);
        
        try {
          // Send simple approval transaction via MetaMask
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              ...result.approvalTransaction,
              from: ethAddress
            }],
          });
          
          console.log('✅ Approval transaction sent:', txHash);
          console.log('🤖 Relayer will now create HTLC contract automatically');
          
          // Show success with transaction hash
          setOrderId(txHash);
          setOrderCreated(true);
          
          // Automatically trigger order processing
          console.log('⚡ Triggering automatic cross-chain processing...');
          
          try {
            const processResponse = await fetch('http://localhost:3001/api/orders/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: result.orderId,
                txHash: txHash
              })
            });
            
            if (processResponse.ok) {
              const processResult = await processResponse.json();
              console.log('✅ Cross-chain processing initiated:', processResult);
              console.log('🌟 Stellar transaction:', processResult.stellarTxId);
              console.log('💫 Expected XLM amount:', processResult.details?.stellar?.amount);
            } else {
              console.error('❌ Processing request failed:', processResponse.status);
            }
          } catch (processError) {
            console.error('❌ Processing request error:', processError);
          }
          
          // Store transaction details for tracking
          console.log('Order approved:', {
            orderId: result.orderId,
            approvalTxHash: txHash,
            fromToken,
            toToken,
            amount,
            estimatedAmount,
            ethAddress,
            stellarAddress,
            direction,
            message: result.message,
            nextStep: result.nextStep
          });
          
        } catch (txError: any) {
          console.error('❌ Approval transaction failed:', txError);
          
          // Handle MetaMask errors
          if (txError.code === 4001) {
            alert('Transaction was rejected by user');
          } else if (txError.code === -32603) {
            alert('Transaction failed. Please check your balance and try again.');
          } else {
            alert(`Transaction error: ${txError.message || 'Unknown error occurred'}`);
          }
          return; // Don't show success if transaction failed
        }
      } else if (direction === 'xlm_to_eth') {
        // XLM → ETH: Use Freighter for Stellar transaction
        console.log('🔄 Creating Stellar payment transaction...');
        console.log('💰 Sending', result.orderData.stellarAmount, 'stroops to relayer');
        
        try {
          // Create Stellar server instance
          const server = new Horizon.Server('https://horizon-testnet.stellar.org');
          
          // Get user's account to build transaction
          const userAccount = await server.loadAccount(stellarAddress);
          
          // Create payment to relayer
          const payment = Operation.payment({
            destination: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37', // Relayer address
            asset: Asset.native(), // XLM
            amount: (parseInt(result.orderData.stellarAmount) / 10000000).toFixed(7), // Convert stroops to XLM
          });

          // Build transaction
          const transaction = new TransactionBuilder(userAccount, {
            fee: '100000', // 0.01 XLM fee
            networkPassphrase: Networks.TESTNET
          })
            .addOperation(payment)
            .addMemo(Memo.text(`Bridge:${result.orderId.substring(0, 20)}`))
            .setTimeout(300)
            .build();

          console.log('📝 Signing transaction with Freighter...');
          
          // Sign with Freighter
          const signedXdr = await signTransaction(transaction.toXDR(), Networks.TESTNET);
          
          console.log('✅ Stellar transaction signed!');
          
          // Submit signed transaction to Stellar network
          const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
          const submitResult = await server.submitTransaction(signedTx);
          
          console.log('🌟 Stellar transaction submitted:', submitResult.hash);
          
          // Show success
          setOrderId(submitResult.hash);
          setOrderCreated(true);
          
          // Process the order on backend
          console.log('⚡ Triggering ETH release...');
          
          try {
            const processResponse = await fetch('http://localhost:3001/api/orders/process', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: result.orderId,
                stellarTxHash: submitResult.hash,
                stellarAddress: stellarAddress
              })
            });
            
            if (processResponse.ok) {
              const processResult = await processResponse.json();
              console.log('✅ ETH release initiated:', processResult);
              console.log('💰 Expected ETH amount:', result.orderData.targetAmount, 'wei');
            } else {
              console.error('❌ ETH release failed:', processResponse.status);
            }
          } catch (processError) {
            console.error('❌ ETH release error:', processError);
          }

        } catch (stellarError: any) {
          console.error('❌ Stellar transaction failed:', stellarError);
          
          // Handle Freighter errors
          if (stellarError.message?.includes('User declined')) {
            alert('Stellar transaction was rejected by user');
          } else {
            alert(`Stellar transaction error: ${stellarError.message || 'Unknown error occurred'}`);
          }
          return;
        }
      } else {
        // Fallback: show order created without transaction
        setOrderId(result.orderId);
        setOrderCreated(true);
        
        console.log('Order created (no transaction):', {
          orderId: result.orderId,
          fromToken,
          toToken,
          amount,
          estimatedAmount,
          ethAddress,
          stellarAddress,
          direction
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error creating order:', error);
      
      // Show error message
      alert(`Error: ${error.message || 'Unknown error occurred'}`);
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