# Nexis - AI-Powered Multi-Chain Web3 Assistant 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF.svg)](https://vitejs.dev/)

> 🌐 Your intelligent AI assistant for seamless multi-chain Web3 interactions

## 🎯 Overview

Nexis is a cutting-edge AI-powered Web3 assistant that simplifies blockchain interactions across multiple networks. Using natural language processing, users can perform complex blockchain operations through simple conversational commands. Built with React, TypeScript, and powered by OpenAI's GPT-4, Nexis makes Web3 accessible to everyone.

## 🔐 Civic Authentication

Nexis leverages **Civic Auth** for secure, seamless Web3 authentication:

- **🛡️ Secure Identity Verification** - Industry-standard Web3 authentication
- **⚡ Frictionless UX** - One-click wallet connection with embedded wallet support
- **🔒 Privacy-First** - No personal data storage, decentralized identity management
- **🌐 Universal Access** - Works across all devices and browsers
- **✨ Smooth Integration** - Embedded wallet code provides intuitive user experience

### Implementation Highlights:
- **Go-to-Market Ready** - Production-grade authentication system
- **Real-World Problem Solving** - Eliminates complex wallet setup barriers
- **Creative Use Case** - AI + Authentication for mass Web3 adoption
- **Marketing Ready** - User-friendly onboarding for mainstream audiences

## 🔗 Supported Blockchains

| Network | Type | Currency | Status |
|---------|------|----------|--------|
| 🟢 **Monad Testnet** | EVM | MONAD | ✅ Active |
| 🔵 **Ethereum Sepolia** | EVM | ETH | ✅ Active |
| 🟡 **Base Sepolia** | EVM | ETH | ✅ Active |
| 🟣 **Polygon Mumbai** | EVM | MATIC | ✅ Active |
| 🔴 **Arbitrum Sepolia** | EVM | ETH | ✅ Active |
| 🟠 **Solana Devnet** | Non-EVM | SOL | ✅ Active |

## ⚡ Key Features

### 🤖 AI-Powered Operations
- **Natural Language Processing** - Interact using plain English
- **Smart Transaction Parsing** - Auto-detects chains, amounts, and recipients
- **Real-Time Price Data** - Live token prices via CoinGecko API
- **Gas Price Monitoring** - Current gas prices across all EVM chains

### 💰 Multi-Chain Operations
- **Cross-Chain Balance Tracking** - Monitor assets across all networks
- **Universal Token Transfers** - Send tokens using natural language
- **Transaction History** - View recent transactions with explorer links
- **Faucet Integration** - Easy testnet token requests

## 🛠️ Available Operations

### Wallet Management
```bash
# Connect wallets
setWallet <evmPrivateKey> <solanaPrivateKey>

# Get wallet addresses
getWalletAddress

# Disconnect all wallets
disconnectWallet
```

### Balance & Transfers
```bash
# Check all balances
getAllBalances

# Smart transfers (natural language)
"Send 0.1 ETH to 0x123... on Base"
"Transfer 0.5 SOL to ABC123..."

# Get gas prices
getGasPrices
```

### Market Data
```bash
# Token prices
getTokenPrices bitcoin,ethereum,solana

# Trending tokens
getTrendingTokens <chain>
```

### Faucets & Tools
```bash
# Get testnet tokens
getFaucetTokens ethereum,solana

# AI assistance
web3Question "How do I bridge tokens?"

# Help
help
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Git
- Civic Auth Client ID

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nexis.git
   cd nexis
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   VITE_CIVIC_AUTH_CLIENT_ID=your_civic_auth_client_id
   VITE_BACKEND_URL=https://nexis-zona.onrender.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080`

## 💡 Usage Examples

### Basic Wallet Operations
```javascript
// Connect your wallets
"Set up my EVM and Solana wallets"

// Check balances
"What's my balance across all chains?"

// View wallet addresses
"Show me my wallet addresses"
```

### Token Transfers
```javascript
// Simple transfers
"Send 0.1 ETH to 0x742d35Cc6634C0532925a3b8D404fAbCe4649681 on Base"

// Cross-chain operations
"Transfer 1 MATIC to 0x123... on Polygon"

// Solana transfers
"Send 0.5 SOL to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
```

### Market Information
```javascript
// Get token prices
"What's the current price of ETH and SOL?"

// Gas prices
"Show me current gas prices"

// Get testnet tokens
"I need testnet ETH for Base Sepolia"
```

## 🏗️ Project Structure

```
nexis/
├── src/
│   ├── components/         # React components
│   ├── contexts/          # Auth context
│   ├── config/            # API configuration
│   ├── pages/             # Main pages
│   └── hooks/             # Custom hooks
├── api/
│   └── agent.ts           # Multi-chain AI agent
├── public/                # Static assets
└── server/                # Backend server
```

## 🔧 Configuration

### Civic Auth Setup
1. Visit [Civic Auth Dashboard](https://auth.civic.com/)
2. Create a new application
3. Copy your Client ID to `.env`

### Backend Configuration
The backend is deployed on Render at `https://nexis-zona.onrender.com`

Required environment variables for backend:
```env
OPENAI_API_KEY=your_openai_api_key
COINGECKO_API_KEY=your_coingecko_api_key (optional)
```

## 📦 Dependencies

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool
- **Civic Auth** - Web3 authentication
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling

### Backend
- **LangChain** - AI framework
- **OpenAI GPT-4** - Language model
- **Ethers.js** - Ethereum interactions
- **Solana Web3.js** - Solana interactions
- **Express.js** - Web server

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agent` | POST | Main AI agent interaction |
| `/health` | GET | Service health check |
| `/chains` | GET | Supported chains info |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Nikhil Raikwar**
- GitHub: [@nikhilraikwar](https://github.com/nikhilraikwar)
- Email: raikwarnikhil80@gmail.com

## 🙏 Acknowledgments

- [Civic](https://civic.com/) for Web3 authentication
- [OpenAI](https://openai.com/) for GPT-4 integration
- [LangChain](https://langchain.com/) for AI framework
- [Base](https://base.org/) for blockchain infrastructure

## 📞 Support

- 📧 Email: aelixai1@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/nikhilraikwar/nexis/issues)

---

<div align="center">
  <p>Made with ❤️ by the Nexis team</p>
  <p>
    <a href="https://nexis-mocha.vercel.app">🌐 Website</a> •
    <a href="https://github.com/nikhilraikwar/nexis">📱 GitHub</a> •
    <a href="https://twitter.com/nikhilraikwarr">🐦 Twitter</a>
  </p>
</div>