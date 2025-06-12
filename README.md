# Nexis - AI-Powered Web3 Assistant 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-646CFF.svg)](https://vitejs.dev/)

Nexis is a decentralized AI-powered Web3 assistant that simplifies blockchain interactions. Connect your wallet with Civic Auth and interact with the blockchain using natural language commands via our AI agent – tip, transfer, check balances, and more on the Base network. 🌐

## ✨ Features

- **🔐 Secure Authentication**: Civic Auth Web3 integration for secure wallet connection
- **💬 Conversational Interface**: Natural language blockchain interactions
- **⚡ Base Network Integration**: Fast and low-cost transactions on Base Sepolia
- **💰 USDC Operations**: Send, receive, and manage USDC tokens
- **📊 Real-time Balance Tracking**: Live balance updates and transaction history
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🎨 Modern UI**: Glass morphism design with smooth animations

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - Modern React with hooks and functional components
- **TypeScript 5.5.3** - Type-safe development
- **Vite 5.4.1** - Fast build tool and development server
- **Tailwind CSS 3.4.11** - Utility-first CSS framework
- **Framer Motion 11.11.17** - Smooth animations and transitions

### UI Components
- **Radix UI** - Accessible, unstyled UI primitives
- **Shadcn/ui** - Beautiful, customizable components
- **Lucide React** - Modern icon library

### Web3 Integration
- **Civic Auth Web3** - Secure wallet authentication
- **Base Network** - Layer 2 Ethereum scaling solution

### State Management & Routing
- **React Router DOM 6.26.2** - Client-side routing
- **TanStack Query 5.56.2** - Server state management
- **React Hook Form 7.53.0** - Form state management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or pnpm package manager
- Git

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
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_CIVIC_AUTH_CLIENT_ID=your_civic_auth_client_id_here
   ```

   **Getting Civic Auth Client ID:**
   - Visit [Civic Auth Dashboard](https://auth.civic.com/)
   - Create a new application
   - Copy your Client ID to the environment variable

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:8080` to see the application running.

## 📁 Project Structure

```
nexis/
├── public/                 # Static assets
│   ├── uploads/           # Image assets
│   └── favicon.png        # Favicon
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── features/      # Feature-specific components
│   │   └── ui/           # Base UI components (shadcn/ui)
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   │   ├── Index.tsx     # Landing page
│   │   └── Dashboard.tsx # Dashboard page
│   ├── config/           # Configuration files
│   └── main.tsx          # Application entry point
├── .env                  # Environment variables
├── package.json          # Dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Deployment

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Environment Variables for Production

Ensure the following environment variables are set in your production environment:

```env
VITE_CIVIC_AUTH_CLIENT_ID=your_production_civic_auth_client_id
```

## 🔐 Authentication Flow

1. **User Authentication**: Users authenticate using Civic Auth Web3
2. **Wallet Connection**: Secure connection to Base Sepolia testnet
3. **Session Management**: Persistent authentication state
4. **Automatic Redirect**: Seamless navigation to dashboard after auth

## 💡 Usage Examples

### Basic Wallet Operations

```typescript
// Check balance
"What's my USDC balance?"

// Send tokens
"Send 10 USDC to 0x1234...5678"

// Tip a user
"Tip @username 5 USDC"

// View transaction history
"Show my recent transactions"
```

## 🎨 Design System

### Colors
- **Primary**: `#4ADE80` (Green)
- **Background**: `#0A0A0A` (Dark)
- **Glass Effect**: `rgba(255,255,255,0.05)` with backdrop blur

### Typography
- **Font Family**: Geist Sans
- **Headings**: Inter (fallback)

### Components
- Glass morphism design
- Smooth hover transitions
- Accessible color contrast
- Mobile-first responsive design

## 🔒 Security

- **No Private Key Storage**: Nexis never stores or accesses private keys
- **Civic Auth Integration**: Industry-standard Web3 authentication
- **Environment Variables**: Sensitive data stored securely
- **HTTPS Only**: All production traffic encrypted

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use conventional commit messages
- Ensure responsive design
- Add proper error handling
- Write meaningful component names
- Maintain accessibility standards

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Nikhil Raikwar**
- GitHub: [@nikhilraikwar](https://github.com/nikhilraikwar)
- Email: contact@nikhilraikwar.com

## 🙏 Acknowledgments

- [Civic](https://civic.com/) for Web3 authentication
- [Base](https://base.org/) for the blockchain infrastructure
- [Shadcn/ui](https://ui.shadcn.com/) for the component library
- [Radix UI](https://radix-ui.com/) for accessible primitives

## 📞 Support

If you encounter any issues or have questions:

1. Check the [FAQ section](#faq) on our website
2. Open an issue on GitHub
3. Contact support through our website

## 🗺️ Roadmap

- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Advanced DeFi integrations
- [ ] Mobile app development
- [ ] Enhanced AI capabilities
- [ ] NFT marketplace integration

---

<div align="center">
  <p>Made with ❤️ by the Nexis team</p>
  <p>
    <a href="https://nexis.vercel.app">Website</a> •
    <a href="https://github.com/nikhilraikwar/nexis">GitHub</a> •
    <a href="https://twitter.com/nexis_ai">Twitter</a>
  </p>
</div>