import { useState } from 'react'
import BridgeForm from './components/BridgeForm'

import TransactionHistory from './components/TransactionHistory'

import { ToastContainer, useToast } from './components/Toast'
import { useFreighter } from './hooks/useFreighter'
import { isTestnet } from './config/networks'

// Window objeleri için type definitions
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      selectedAddress?: string;
    };
  }
}

function App() {
  const [ethAddress, setEthAddress] = useState<string>('');
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'bridge' | 'history'>('bridge');
  const [currentNetwork, setCurrentNetwork] = useState<'testnet' | 'mainnet'>(isTestnet() ? 'testnet' : 'mainnet');
  
  // Freighter hook usage
  const {
    isConnected: stellarConnected,
    address: stellarAddress,
    isLoading: stellarLoading,
    error: stellarError,
    connect: connectFreighter,
    disconnect: disconnectFreighter,
  } = useFreighter();

  // Toast hook
  const toast = useToast();

  // Network toggle handler with MetaMask auto-switching
  const toggleNetwork = async () => {
    const newNetwork = currentNetwork === 'testnet' ? 'mainnet' : 'testnet';
    setCurrentNetwork(newNetwork);
    
    // Auto-switch MetaMask network if connected
    if (window.ethereum && ethAddress) {
      try {
        const targetChainId = newNetwork === 'mainnet' ? '0x1' : '0xaa36a7'; // 0x1 = 1 (Ethereum Mainnet)
        const networkName = newNetwork === 'mainnet' ? 'Ethereum Mainnet' : 'Sepolia Testnet';
        
        // Try to switch network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
        
        toast.success('Network Switched!', `MetaMask switched to ${networkName}`);
        
      } catch (switchError: any) {
        // If network not added (error 4902), add it
        if (switchError.code === 4902 && newNetwork === 'mainnet') {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x1', // 1 for Ethereum Mainnet
                chainName: 'Ethereum Mainnet',
                rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY_HERE'],
                blockExplorerUrls: ['https://etherscan.io'],
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18
                }
              }],
            });
            toast.success('Network Added!', 'Ethereum Mainnet added to MetaMask');
          } catch (addError: any) {
            toast.error('Network Switch Failed', 'Please switch MetaMask manually');
          }
        } else {
          toast.warning('Manual Switch Required', 'Please switch MetaMask network manually');
        }
      }
    }
    
    // Update URL parameter
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('network', newNetwork);
      window.history.replaceState({}, '', currentUrl.toString());
      
      // Show network change notification
      toast.success(
        'Network Mode Changed!', 
        `Switched to ${newNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'} mode`
      );
      
      // Auto refresh after 2 seconds to apply network changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };



  // MetaMask connection
  const connectMetaMask = async () => {
    setIsConnecting(true);
    setConnectionError('');
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask bulunamadı! Lütfen MetaMask yükleyin.');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setEthAddress(accounts[0]);
        setShowWalletMenu(false);
        toast.success('MetaMask Connected!', `Connected to ${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}`);
      }
    } catch (error: any) {
      setConnectionError(`MetaMask: ${error.message}`);
      toast.error('Connection Failed', error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Freighter connection - Using hook
  const handleFreighterConnect = async () => {
    try {
      await connectFreighter();
      setShowWalletMenu(false);
    } catch (error: any) {
      setConnectionError(`Freighter: ${error.message}`);
    }
  };

  // Wallet disconnect
  const disconnectWallets = () => {
    setEthAddress('');
    disconnectFreighter();
    setShowWalletMenu(false);
  };

  const isWalletsConnected = ethAddress && stellarConnected;
  const hasAnyConnection = ethAddress || stellarConnected;

  return (
    <div className="min-h-screen text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/images/oversync-logo.png" 
            alt="OverSync" 
            className="w-12 h-12 rounded-lg"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-[#6C63FF] to-[#3ABEFF] bg-clip-text text-transparent">
            OverSync
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <a href="https://www.alchemy.com/faucets/ethereum-sepolia" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Faucet</a>
          </nav>
          
          {/* Network Toggle Button */}
          <button
            onClick={toggleNetwork}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 network-button-hover ${
              currentNetwork === 'mainnet'
                ? 'network-mainnet border border-[#3ABEFF]/30'
                : 'network-testnet border border-[#FFDD57]/30'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              currentNetwork === 'mainnet' ? 'bg-[#3ABEFF]' : 'bg-[#FFDD57]'
            }`}></div>
            {currentNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}
          </button>
          
          {/* Connect Wallet Button */}
          <div className="relative">
            <button 
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="bg-gradient-to-r from-[#6C63FF] to-[#3ABEFF] hover:from-[#5A52E8] hover:to-[#2A9FE8] text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 button-hover-scale"
            >
              {isWalletsConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Connected
                </>
              ) : hasAnyConnection ? (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  Partial
                </>
              ) : (
                'Connect Wallet'
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-200" style={{ transform: showWalletMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>

            {/* Wallet Dropdown Menu */}
            {showWalletMenu && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-[100] p-4">
                <h3 className="text-white font-semibold mb-4 text-center">Connect Wallets</h3>
                
                {(connectionError || stellarError) && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">{connectionError || stellarError}</p>
                  </div>
                )}

                {/* MetaMask */}
                <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🦊</span>
                      <div>
                        <div className="text-white font-medium">MetaMask</div>
                        <div className="text-xs text-gray-400">Ethereum Network</div>
                      </div>
                    </div>
                    
                    {ethAddress ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-400">Connected</span>
                        </div>
                        <p className="text-xs text-gray-300">
                          {ethAddress.substring(0, 6)}...{ethAddress.substring(ethAddress.length - 4)}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={connectMetaMask}
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-2 rounded-lg transition-colors text-sm"
                        disabled={isConnecting}
                      >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Freighter */}
                <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🚀</span>
                      <div>
                        <div className="text-white font-medium">Freighter</div>
                        <div className="text-xs text-gray-400">Stellar Network</div>
                      </div>
                    </div>
                    
                    {stellarConnected && stellarAddress ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-400">Connected</span>
                        </div>
                        <p className="text-xs text-gray-300">
                          {stellarAddress.substring(0, 6)}...{stellarAddress.substring(stellarAddress.length - 4)}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFreighterConnect}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors text-sm"
                        disabled={stellarLoading}
                      >
                        {stellarLoading ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Disconnect Button */}
                {hasAnyConnection && (
                  <button
                    onClick={disconnectWallets}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 py-2 rounded-lg transition-colors text-sm border border-red-500/30"
                  >
                    Disconnect All
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>



      {/* Hero Section */}
      <div className="text-center py-8 px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="page-title-gradient">
            Cross-chain Swap
          </span>
        </h1>
        <p className="text-lg text-gray-300 mb-2 max-w-2xl mx-auto">
          Bridge your assets seamlessly between Ethereum and Stellar networks
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Powered by Hash Time Locked Contracts (HTLC) for secure cross-chain transfers
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'bridge'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#3ABEFF] text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Bridge
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#6C63FF] to-[#3ABEFF] text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-6 pb-32 gap-4 flex-1">
        {activeTab === 'bridge' && (
          <div className="w-full max-w-2xl ml-36">
            <BridgeForm 
              ethAddress={ethAddress} 
              stellarAddress={stellarAddress || ''}
            />
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="w-full max-w-4xl">
            <TransactionHistory
              ethAddress={ethAddress}
              stellarAddress={stellarAddress || ''}
            />
          </div>
        )}
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6C63FF]/10 rounded-full blur-3xl"></div>
      </div>

      {/* Footer Bar */}
      <div className="w-full h-[28px] bg-[#0b0f1a] flex items-center justify-end px-6">
        <a 
          href="https://x.com/OverBlock_" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white hover:text-[#3ABEFF] transition-colors text-lg font-semibold flex items-center gap-2"
        >
          Powered by OverBlock
          <span className="text-xl">𝕏</span>
        </a>
      </div>

      {/* Overlay for closing dropdown */}
      
      {/* Toast Container */}
      <ToastContainer 
        toasts={toast.toasts}
        onClose={toast.removeToast}
      />

    </div>
  );
}

export default App; 