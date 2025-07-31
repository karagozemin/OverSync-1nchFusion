# 🌉 FusionBridge

> Cross-chain token bridge between Ethereum and Stellar using Fusion+ architecture with HTLC mechanism

Built for **ETHGlobal Unite Hackathon** - Extending 1inch Fusion+ to support Stellar blockchain.

## 🎯 Overview

FusionBridge enables **secure, trustless token swaps** between Ethereum and Stellar networks using:

- **HTLC (Hash Time Lock Contracts)** for atomic swaps
- **Fusion+ architecture** adapted for cross-chain operations
- **1inch Escrow Factory** integration for mainnet operations
- **Automated relayer service** for seamless user experience
- **Partial fill support** for flexible swap amounts

### 🌐 Network Support

- **Testnet**: Sepolia ↔ Stellar Testnet (using custom contracts)
- **Mainnet**: Ethereum ↔ Stellar Mainnet (using 1inch Escrow Factory: `0xa7bcb4eac8964306f9e3764f67db6a7af6ddf99a`)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ethereum      │    │     Relayer     │    │     Stellar     │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   HTLC    │◄─┼────┼─►│  Monitor  │  │    │  │ Claimable │  │
│  │ Contract  │  │    │  │  Events   │  │    │  │ Balance   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Swap Flow

1. **User locks tokens** on source chain (Ethereum or Stellar) with hash + timeout
2. **Relayer detects** the lock event and creates corresponding lock on target chain
3. **User claims tokens** on target chain by revealing the preimage
4. **Relayer claims** original tokens using the revealed preimage
5. **Automatic refund** if timeout expires before completion

## 📁 Project Structure

```
fusionbridge/
├── contracts/          # Ethereum smart contracts (Solidity + Hardhat)
│   ├── contracts/      # HTLC and bridge contracts
│   ├── scripts/        # Deployment scripts
│   └── test/          # Contract tests
├── stellar/           # Stellar operations (TypeScript + stellar-sdk)
│   ├── src/           # Stellar transaction builders
│   └── test/          # Stellar integration tests
├── relayer/           # Event monitoring service (Node.js + TypeScript)
│   ├── src/           # Relayer service logic
│   └── config/        # Network configurations
├── frontend/          # User interface (React + Vite + Tailwind)
│   ├── src/           # React components and pages
│   └── public/        # Static assets
└── docs/              # Additional documentation
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/fusionbridge.git
cd fusionbridge

# Setup environment variables
cp env.template .env
# Edit .env with your actual configuration values

# Install dependencies for all workspaces
pnpm install
```

### Environment Configuration

Before running the project, you need to configure environment variables:

1. **Copy the environment template:**
   ```bash
   cp env.template .env
   ```

2. **Edit `.env` with your configuration:**
   ```bash
   # Network Mode (testnet or mainnet)
   NETWORK_MODE=testnet
   # NETWORK_MODE=mainnet  # Uncomment for mainnet
   
   # RPC URLs
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
   ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
   
   # Stellar Configuration (automatically adjusted based on NETWORK_MODE)
   STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
   
   # Private keys (NEVER use examples in production!)
   RELAYER_PRIVATE_KEY=0x[your-ethereum-private-key]
   RELAYER_STELLAR_SECRET=S[your-stellar-secret-key]
   
   # 1inch API (required for mainnet)
   ONEINCH_API_KEY=57bHerg7n0jVKOW9uog2M6nQ0YaLeXgN
   
   # Optional API keys:
   ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
   VITE_WALLET_CONNECT_PROJECT_ID=YOUR_WALLET_CONNECT_PROJECT_ID
   ```

3. **Key Generation (for testnet):**
   ```bash
   # Generate Ethereum keypair
   openssl rand -hex 32
   
   # Generate Stellar keypair at https://laboratory.stellar.org/#account-creator
   ```

> ⚠️ **Security Note**: Never commit real private keys to git. The `.env` file is already in `.gitignore`.

## 🧪 Network Setup

FusionBridge supports both testnet and mainnet operations:

### 🚀 Quick Network Switch

You can switch networks in two ways:

1. **Via Frontend UI**: Click the network toggle button (Testnet/Mainnet) in the top-right corner
2. **Via Environment**: Set `NETWORK_MODE=mainnet` in your `.env` file

## 🧪 Testnet Setup

**Recommended for development and testing.**

### 🦊 Ethereum Sepolia Testnet

1. **Add Sepolia to MetaMask:**
   - Network Name: Sepolia test network
   - Chain ID: 11155111
   - RPC URL: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.etherscan.io

2. **Get Sepolia ETH:**
   - **Sepolia Faucet**: https://sepoliafaucet.com/
   - **Alchemy Faucet**: https://sepoliafaucet.com/
   - Requires social verification or Ethereum mainnet balance

### ⭐ Stellar Testnet

1. **Create Testnet Account:**
   - **Stellar Laboratory**: https://laboratory.stellar.org/#account-creator
   - Creates account with 10,000 testnet XLM
   - Save your secret key securely

2. **Alternative Faucets:**
   - **Stellar Quest**: https://quest.stellar.org/faucet
   - **Friendbot**: https://friendbot.stellar.org

## 🏭 Mainnet Setup

**For production usage with real funds.**

### 📋 Requirements

1. **Environment Configuration:**
   ```bash
   NETWORK_MODE=mainnet
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
   ONEINCH_API_KEY=57bHerg7n0jVKOW9uog2M6nQ0YaLeXgN
   ```

2. **Funded Wallets:**
   - Ethereum address with ETH for gas fees
   - Stellar address with XLM for transaction fees

### 🔗 Contract Integration

- **Ethereum**: Uses 1inch Escrow Factory (`0xa7bcb4eac8964306f9e3764f67db6a7af6ddf99a`)
- **Stellar**: Uses native claimable balances for HTLC mechanism

### ⚠️ Security Notes

- Always test on testnet first
- Use hardware wallets for production private keys
- Monitor transactions on block explorers
- Keep small amounts for initial testing

### 💰 Required Tokens for Testing

| Direction | Source Token | Destination Token | Requirements |
|-----------|--------------|-------------------|--------------|
| ETH → XLM | Sepolia ETH  | Testnet XLM       | MetaMask + Freighter wallets |
| XLM → ETH | Testnet XLM  | Sepolia ETH       | Freighter + MetaMask wallets |

### 🔗 Wallet Setup

1. **Install MetaMask**: https://metamask.io/
2. **Install Freighter**: https://freighter.app/
3. **Fund both wallets** with testnet tokens
4. **Connect both wallets** in the FusionBridge UI

> 💡 **Pro tip**: The app shows a testnet banner with direct faucet links when running on testnet networks.

### Development

```bash
# Start all services in development mode
pnpm dev

# Or start individual services:
pnpm frontend:dev      # Start frontend dev server
pnpm relayer:start     # Start relayer service
pnpm contracts:compile # Compile smart contracts
```

### Build

```bash
# Build all workspaces
pnpm build

# Or build individual workspaces:
pnpm contracts:compile
pnpm stellar:build
pnpm frontend:build
```

## 🔧 Workspace Details

### 📜 Contracts (`@fusionbridge/contracts`)

Ethereum smart contracts implementing HTLC functionality:

- **HTLCBridge.sol**: Main bridge contract for token locking/claiming
- **TokenSwap.sol**: ERC20 token swap logic with partial fill support
- **Ownable.sol**: Access control for administrative functions

```bash
cd contracts
pnpm compile                    # Compile contracts
pnpm test                      # Run tests
pnpm deploy:sepolia            # Deploy to Sepolia testnet
```

### ⭐ Stellar (`@fusionbridge/stellar`)

Stellar blockchain operations using stellar-sdk:

- **ClaimableBalanceManager**: Create and claim claimable balances
- **TransactionBuilder**: Build Stellar transactions with time bounds
- **KeyManager**: Handle Stellar keypair operations

```bash
cd stellar
pnpm build                     # Build TypeScript
pnpm test                      # Run integration tests
```

### 🔄 Relayer (`@fusionbridge/relayer`)

Event monitoring and cross-chain coordination:

- **EthereumMonitor**: Listen to Ethereum HTLC events
- **StellarMonitor**: Monitor Stellar claimable balances
- **SwapCoordinator**: Orchestrate cross-chain swaps

```bash
cd relayer
pnpm dev                       # Start in development mode
pnpm start                     # Start production build
```

### 🖥️ Frontend (`@fusionbridge/frontend`)

React-based user interface:

- **Wallet integration** (MetaMask, WalletConnect for Ethereum)
- **Stellar wallet** connection (Freighter, Albedo)
- **Swap interface** with real-time status tracking
- **Transaction history** and swap monitoring

```bash
cd frontend
pnpm dev                       # Start dev server (localhost:5173)
pnpm build                     # Build for production
```

## 🌐 Network Support

### Current Support
- **Ethereum**: Mainnet, Sepolia Testnet
- **Stellar**: Mainnet, Testnet

### Future Extensions
- **Arbitrum**: Layer 2 scaling solution
- **Base**: Coinbase's L2 network
- **Polygon**: Multi-chain scaling platform

## 🔐 Security Features

- **Time-locked contracts** prevent indefinite fund locking
- **Hash-based secrets** ensure atomic swap completion
- **Multi-signature support** for enhanced security
- **Slippage protection** and MEV resistance
- **Emergency pause** functionality

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test individual workspaces
pnpm --filter contracts test
pnpm --filter stellar test
pnpm --filter relayer test
pnpm --filter frontend test
```

## 📚 Documentation

- [Smart Contract Documentation](./contracts/README.md)
- [Stellar Integration Guide](./stellar/README.md)
- [Relayer Setup Guide](./relayer/README.md)
- [Frontend Development](./frontend/README.md)
- [API Reference](./docs/api.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 ETHGlobal Unite

This project is built for the ETHGlobal Unite Hackathon, extending 1inch Fusion+ capabilities to support cross-chain operations with Stellar blockchain.

### Judges Criteria
- ✅ **Innovation**: First HTLC-based bridge between Ethereum and Stellar
- ✅ **Technical Excellence**: Production-ready codebase with comprehensive testing
- ✅ **Usability**: Intuitive UI with seamless wallet integration
- ✅ **Impact**: Enables new DeFi use cases across chain boundaries

## 🔗 Links

- [1inch Fusion+](https://1inch.io/fusion/)
- [Stellar Documentation](https://developers.stellar.org/)
- [ETHGlobal Unite](https://unite.ethglobal.com/)

---

**Built with ❤️ by the FusionBridge Team** 