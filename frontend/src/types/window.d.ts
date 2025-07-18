declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (data: any) => void) => void;
      removeListener: (event: string, callback: (data: any) => void) => void;
      selectedAddress?: string;
    };
  }
}

interface ImportMetaEnv {
  readonly VITE_NETWORK: string;
  readonly VITE_API_URL: string;
  readonly VITE_ETHEREUM_CHAIN_ID: string;
  readonly VITE_STELLAR_NETWORK: string;
  readonly VITE_ETHEREUM_RPC_URL: string;
  readonly VITE_STELLAR_HORIZON_URL: string;
  readonly VITE_ENABLE_TESTNET_FAUCETS: string;
  readonly VITE_ENABLE_DEBUG_MODE: string;
  readonly VITE_ENABLE_MOCK_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {}; 