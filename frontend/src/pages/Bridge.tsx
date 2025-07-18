import BridgeForm from '../components/BridgeForm';
import { useFreighter } from '../hooks/useFreighter';
import { useState, useEffect } from 'react';

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

export default function Bridge() {
  const [ethAddress, setEthAddress] = useState<string>('');
  const { address: stellarAddress } = useFreighter();

  // MetaMask bağlantısı kontrolü
  useEffect(() => {
    const checkEthConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        setEthAddress(window.ethereum.selectedAddress);
      }
    };
    
    checkEthConnection();
    
    // MetaMask hesap değişikliklerini dinle
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setEthAddress(accounts[0]);
      } else {
        setEthAddress('');
      }
    };
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      // Cleanup listener
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Bridge Form */}
      <BridgeForm 
        ethAddress={ethAddress} 
        stellarAddress={stellarAddress || ''}
      />
    </div>
  );
} 