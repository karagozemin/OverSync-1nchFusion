# 🌉 FusionBridge

> Cross-chain token bridge between Ethereum and Stellar using Fusion+ architecture with HTLC mechanism

Built for **ETHGlobal Unite Hackathon** - Extending 1inch Fusion+ to support Stellar blockchain.

## 🎯 Overview

FusionBridge enables **secure, trustless token swaps** between Ethereum and Stellar networks using:

- **HTLC (Hash Time Lock Contracts)** for atomic swaps
- **Fusion+ architecture** adapted for cross-chain operations
- **Automated relayer service** for seamless user experience
- **Partial fill support** for flexible swap amounts

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

# Install dependencies for all workspaces
pnpm install
```

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