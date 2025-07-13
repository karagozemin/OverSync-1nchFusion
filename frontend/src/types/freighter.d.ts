declare module '@stellar/freighter-api' {
  interface FreighterApi {
    isConnected(): Promise<boolean>;
    getAddress(): Promise<{ address: string }>;
    setAllowed(): Promise<void>;
    signTransaction(xdr: string, options?: { 
      networkPassphrase?: string; 
      address?: string; 
    }): Promise<{ signedTxXdr: string }>;
    signAuthEntry(entryXdr: string, options?: { 
      networkPassphrase?: string; 
      address?: string; 
    }): Promise<{ signedAuthEntry: string }>;
    getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
    getNetworkDetails(): Promise<{ network: string; networkPassphrase: string }>;
  }

  const freighterApi: FreighterApi;
  export default freighterApi;
}

// Window interface extension (fallback için)
declare global {
  interface Window {
    freighterApi?: {
      isConnected(): Promise<boolean>;
      getAddress(): Promise<{ address: string }>;
      setAllowed(): Promise<void>;
      signTransaction(xdr: string, options?: any): Promise<{ signedTxXdr: string }>;
      signAuthEntry(entryXdr: string, options?: any): Promise<{ signedAuthEntry: string }>;
      getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
    };
  }
} 