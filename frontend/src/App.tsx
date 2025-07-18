import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useFreighter } from './hooks/useFreighter'

// Pages
import Bridge from './pages/Bridge'
import Recovery from './pages/Recovery'
import History from './pages/History'

// Window objeleri için type definitions
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      selectedAddress?: string;
      on: (event: string, callback: any) => void;
      removeListener: (event: string, callback: any) => void;
    };
  }
}

function App() {
  const [ethAddress, setEthAddress] = useState<string>('');
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const location = useLocation();
  
  // Freighter hook usage
  const {
    isConnected: stellarConnected,
    address: stellarAddress,
    isLoading: stellarLoading,
    error: stellarError,
    connect: connectFreighter,
    disconnect: disconnectFreighter,
  } = useFreighter();

  // MetaMask bağlantısı
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
      }
    } catch (error: any) {
      setConnectionError(`MetaMask: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Freighter bağlantısı
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

  // MetaMask bağlantısını kontrol et
  useEffect(() => {
    const checkEthConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        setEthAddress(window.ethereum.selectedAddress);
      }
    };
    
    checkEthConnection();
  }, []);

  const isWalletsConnected = ethAddress && stellarConnected;
  const hasAnyConnection = ethAddress || stellarConnected;

  return (
    <div className="h-full w-full bg-[#0d111c] text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-sm bg-[#0d111c]/80">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-bold text-white">
              Fusion+Bridge
            </span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`transition-colors ${location.pathname === '/' ? 'text-blue-400 font-medium' : 'text-gray-300 hover:text-white'}`}
            >
              Bridge & Swap
            </Link>
            <Link 
              to="/history" 
              className={`transition-colors ${location.pathname === '/history' ? 'text-blue-400 font-medium' : 'text-gray-300 hover:text-white'}`}
            >
              History
            </Link>
          </nav>
          
          {/* Connect Wallet Button */}
          <div className="relative">
            <button 
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className={`${
                isWalletsConnected 
                  ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/30' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2`}
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
                'Connect wallet'
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-200" style={{ transform: showWalletMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>

            {/* Wallet Dropdown Menu */}
            {showWalletMenu && (
              <div className="absolute top-full right-0 mt-2 w-80 glass-effect rounded-xl z-[100] p-4">
                <h3 className="text-white font-semibold mb-4 text-center">Connect Wallets</h3>
                
                {(connectionError || stellarError) && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{connectionError || stellarError}</p>
                  </div>
                )}

                {/* MetaMask */}
                <div className="mb-4 p-4 bg-[#131823] rounded-xl border border-white/5">
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
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-2 rounded-lg transition-colors text-sm border border-orange-500/30"
                      >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Freighter */}
                <div className="mb-4 p-4 bg-[#131823] rounded-xl border border-white/5">
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
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-colors text-sm border border-blue-500/30"
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

      {/* Main Content */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Bridge />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </div>
  );
}

export default App; 