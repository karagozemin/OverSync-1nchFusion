/**
 * Network Configuration for FusionBridge
 */

export interface NetworkConfig {
  id: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet: boolean;
}

export interface StellarNetworkConfig {
  name: string;
  displayName: string;
  horizonUrl: string;
  networkPassphrase: string;
  explorerUrl: string;
  testnet: boolean;
}

export const ETHEREUM_NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    testnet: false,
  },
  sepolia: {
    id: 11155111,
    name: 'sepolia',
    displayName: 'Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18,
    },
    testnet: true,
  },
  hardhat: {
    id: 31337,
    name: 'hardhat',
    displayName: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    testnet: true,
  },
};

export const STELLAR_NETWORKS: Record<string, StellarNetworkConfig> = {
  mainnet: {
    name: 'mainnet',
    displayName: 'Stellar Mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    explorerUrl: 'https://stellarchain.io',
    testnet: false,
  },
  testnet: {
    name: 'testnet',
    displayName: 'Stellar Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    explorerUrl: 'https://testnet.stellarchain.io',
    testnet: true,
  },
};

export const CONTRACT_ADDRESSES = {
  ethereum: {
    mainnet: {
      htlcBridge: '0x0000000000000000000000000000000000000000',
      escrowFactory: '0x0000000000000000000000000000000000000000',
      testToken: '0x0000000000000000000000000000000000000000',
    },
    sepolia: {
      htlcBridge: '0x0000000000000000000000000000000000000000',
      escrowFactory: '0x0000000000000000000000000000000000000000',
      testToken: '0x0000000000000000000000000000000000000000',
    },
  },
  stellar: {
    mainnet: {
      // Stellar uses account addresses, not contract addresses
      bridgeAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      escrowAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    testnet: {
      bridgeAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      escrowAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },
};

export const FAUCETS = {
  ethereum: {
    sepolia: [
      {
        name: 'Sepolia Faucet',
        url: 'https://sepoliafaucet.com/',
        description: 'Get Sepolia ETH for testing',
      },
      {
        name: 'Alchemy Faucet',
        url: 'https://sepoliafaucet.com/',
        description: 'Alchemy Sepolia ETH Faucet',
      },
    ],
  },
  stellar: {
    testnet: [
      {
        name: 'Stellar Testnet Faucet',
        url: 'https://laboratory.stellar.org/#account-creator',
        description: 'Create and fund testnet accounts',
      },
      {
        name: 'Stellar Quest Faucet',
        url: 'https://quest.stellar.org/faucet',
        description: 'Get testnet XLM',
      },
    ],
  },
};

// Environment-based configuration
export const getCurrentNetwork = () => {
  const networkName = (import.meta as any).env?.VITE_NETWORK || 'testnet';
  return {
    ethereum: ETHEREUM_NETWORKS[networkName === 'mainnet' ? 'mainnet' : 'sepolia'],
    stellar: STELLAR_NETWORKS[networkName === 'mainnet' ? 'mainnet' : 'testnet'],
  };
};

export const getContractAddresses = () => {
  const networkName = (import.meta as any).env?.VITE_NETWORK || 'testnet';
  return {
    ethereum: CONTRACT_ADDRESSES.ethereum[networkName === 'mainnet' ? 'mainnet' : 'sepolia'],
    stellar: CONTRACT_ADDRESSES.stellar[networkName === 'mainnet' ? 'mainnet' : 'testnet'],
  };
};

export const getFaucets = () => {
  const networkName = (import.meta as any).env?.VITE_NETWORK || 'testnet';
  if (networkName === 'mainnet') {
    return { ethereum: [], stellar: [] };
  }
  return {
    ethereum: FAUCETS.ethereum.sepolia,
    stellar: FAUCETS.stellar.testnet,
  };
};

export const isTestnet = () => {
  const networkName = (import.meta as any).env?.VITE_NETWORK || 'testnet';
  return networkName !== 'mainnet';
}; 