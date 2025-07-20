import { useState } from 'react'
import BridgeForm from './components/BridgeForm'
import FreighterTest from './components/FreighterTest'
import DutchAuction from './components/DutchAuction'
import RecoveryPanel from './components/RecoveryPanel'

import { ToastContainer, useToast } from './components/Toast'
import { useFreighter } from './hooks/useFreighter'

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
  const [activeTab, setActiveTab] = useState<'bridge' | 'recovery'>('bridge');
  
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

  // Dutch Auction state
  const [auctionData] = useState({
    initialPrice: 2994.54,
    endPrice: 2985.12,
    duration: 300, // 5 minutes
    startTime: Date.now() / 1000,
    gasPrice: 25.5,
    isActive: false
  });

  // MetaMask bağlantısı
  const connectMetaMask = async () => {
    console.log('MetaMask connect clicked!'); // Debug
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

  // Freighter bağlantısı - Hook kullanarak
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      {/* Top Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            FusionBridge
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Swap</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Bridge</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Pool</a>
          </nav>
          
          {/* Connect Wallet Button */}
          <div className="relative">
            <button 
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
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
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('MetaMask button mousedown');
                          connectMetaMask();
                        }}
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-2 rounded-lg transition-colors text-sm cursor-pointer relative z-[110]"
                        style={{ pointerEvents: 'auto' }}
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
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Freighter button mousedown');
                          handleFreighterConnect();
                        }}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors text-sm cursor-pointer relative z-[110]"
                        style={{ pointerEvents: 'auto' }}
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
      <div className="text-center py-12 px-6">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Cross-chain Swap
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-2 max-w-2xl mx-auto">
          Bridge your assets seamlessly between Ethereum and Stellar networks
        </p>
        <p className="text-sm text-gray-400 mb-12">
          Powered by Hash Time Locked Contracts (HTLC) for secure cross-chain transfers
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'bridge'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Bridge
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'recovery'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Recovery
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-6 pb-12 gap-8">
        {activeTab === 'bridge' && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <BridgeForm 
                ethAddress={ethAddress} 
                stellarAddress={stellarAddress || ''}
              />
              <FreighterTest />
            </div>
            <div className="space-y-6">
              <DutchAuction
                initialPrice={auctionData.initialPrice}
                endPrice={auctionData.endPrice}
                duration={auctionData.duration}
                startTime={auctionData.startTime}
                gasPrice={auctionData.gasPrice}
                isActive={auctionData.isActive}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'recovery' && (
          <div className="w-full max-w-4xl">
            <RecoveryPanel
              ethAddress={ethAddress}
              stellarAddress={stellarAddress || ''}
              onRecoverySuccess={(orderId) => {
                toast.success('Recovery Successful!', `Order ${orderId} has been recovered successfully`);
              }}
              onRecoveryError={(orderId, error) => {
                toast.error('Recovery Failed', `Failed to recover order ${orderId}: ${error}`);
              }}
            />
          </div>
        )}
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Dropdown kapatma için overlay */}
      
      {/* Toast Container */}
      <ToastContainer 
        toasts={toast.toasts}
        onClose={toast.removeToast}
      />

    </div>
  );
}

export default App; 