import { useState } from 'react';
import { AlertTriangle, X, ExternalLink, Info } from 'lucide-react';
import { isTestnet, getFaucets } from '../config/networks';

interface TestnetBannerProps {
  className?: string;
}

export default function TestnetBanner({ className = '' }: TestnetBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showFaucets, setShowFaucets] = useState(false);

  // Only show on testnet
  if (!isTestnet() || !isVisible) {
    return null;
  }

  const faucets = getFaucets();

  return (
    <div className={`bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-200 mb-1">
              🧪 Testnet Environment
            </h3>
            <p className="text-sm text-yellow-300 mb-3">
              You're using the testnet version of FusionBridge. This is for testing purposes only. 
              Transactions use testnet tokens with no real value.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFaucets(!showFaucets)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-yellow-800/30 text-yellow-200 text-xs font-medium rounded-md hover:bg-yellow-700/40 transition-colors"
              >
                <Info className="h-3 w-3" />
                <span>{showFaucets ? 'Hide' : 'Show'} Faucets</span>
              </button>
              
              <a
                href="https://docs.fusionbridge.io/testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-800/30 text-blue-200 text-xs font-medium rounded-md hover:bg-blue-700/40 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Testnet Guide</span>
              </a>
            </div>

            {showFaucets && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-yellow-200">
                  🚰 Get Testnet Tokens
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Ethereum Faucets */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-yellow-300 flex items-center space-x-1">
                      <span>🦊</span>
                      <span>Ethereum Sepolia</span>
                    </h5>
                    <div className="space-y-1">
                      {faucets.ethereum.map((faucet, index) => (
                        <a
                          key={index}
                          href={faucet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-800 rounded border border-yellow-800 hover:bg-yellow-900/10 transition-colors text-xs"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {faucet.name}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {faucet.description}
                            </div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Stellar Faucets */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-yellow-300 flex items-center space-x-1">
                      <span>⭐</span>
                      <span>Stellar Testnet</span>
                    </h5>
                    <div className="space-y-1">
                      {faucets.stellar.map((faucet, index) => (
                        <a
                          key={index}
                          href={faucet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-800 rounded border border-yellow-800 hover:bg-yellow-900/10 transition-colors text-xs"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {faucet.name}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {faucet.description}
                            </div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800 rounded">
                  <p className="text-xs text-blue-300">
                    <strong>💡 Pro tip:</strong> You'll need both Sepolia ETH and Stellar testnet XLM to test cross-chain swaps. 
                    Make sure to fund both wallet addresses before testing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-yellow-400 hover:text-yellow-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 