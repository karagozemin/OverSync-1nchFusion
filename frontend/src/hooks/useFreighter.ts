import { useCallback, useEffect, useState } from 'react';
import freighterApi from '@stellar/freighter-api';

interface FreighterState {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useFreighter() {
  const [state, setState] = useState<FreighterState>({
    isConnected: false,
    address: null,
    isLoading: false,
    error: null,
  });

  // Check if Freighter is connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await freighterApi.isConnected();
        if (isConnected) {
          const { address } = await freighterApi.getAddress();
          setState(prev => ({
            ...prev,
            isConnected: true,
            address,
            error: null,
          }));
        }
      } catch (error) {
        console.error('Error checking Freighter connection:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Connection check failed',
        }));
      }
    };

    checkConnection();
  }, []);

  // Connect to Freighter
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const isAvailable = await freighterApi.isConnected();
      if (!isAvailable) {
        throw new Error('Freighter wallet is not available. Please install Freighter extension.');
      }

      await freighterApi.setAllowed();
      const { address } = await freighterApi.getAddress();
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        address,
        isLoading: false,
        error: null,
      }));

      return address;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Freighter';
      setState(prev => ({
        ...prev,
        isConnected: false,
        address: null,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Disconnect from Freighter
  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // Get network info
  const getNetworkInfo = useCallback(async () => {
    try {
      const networkInfo = await freighterApi.getNetwork();
      return networkInfo;
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  }, []);

  // Sign transaction
  const signTransaction = useCallback(async (xdr: string, networkPassphrase?: string) => {
    if (!state.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await freighterApi.signTransaction(xdr, {
        networkPassphrase,
        address: state.address,
      });
      return result.signedTxXdr;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }, [state.address]);

  return {
    ...state,
    connect,
    disconnect,
    getNetworkInfo,
    signTransaction,
  };
} 