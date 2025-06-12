import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";
import { ethers } from "ethers";
import axios from "axios";
import * as cheerio from "cheerio";
import { Logger } from "tslog";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
const envPath = resolve(__dirname, '../.env');
console.log('Loading environment variables from:', envPath);
dotenv.config({ path: envPath });

// Logger setup
const log = new Logger({ name: "NexisAgent" });

console.log('🚀 Starting Nexis Agent Server...');
console.log('📁 Loading environment variables...');

// Debug logging for environment variables
console.log('Current working directory:', process.cwd());
console.log('Environment file path:', envPath);
console.log('Environment variables loaded:', {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Present' : 'Missing',
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY ? 'Present' : 'Missing',
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL ? 'Present' : 'Missing',
  MONAD_RPC_URL: process.env.MONAD_RPC_URL ? 'Present' : 'Missing',
  BSC_RPC_URL: process.env.BSC_RPC_URL ? 'Present' : 'Missing',
  BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL ? 'Present' : 'Missing'
});

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

console.log('🔑 OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
console.log('💰 CoinGecko API Key configured:', !!COINGECKO_API_KEY);

// Validate OpenAI API key
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required but not found in environment variables');
  process.exit(1);
}

// Debug API key format
console.log('API Key format check:', {
  length: OPENAI_API_KEY.length,
  startsWith: OPENAI_API_KEY.substring(0, 7),
  hasSpaces: OPENAI_API_KEY.includes(' ')
});

// Chain configurations
const CHAINS = {
  ethereum: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: ETHEREUM_RPC_URL,
    explorerUrl: "https://etherscan.io",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  monad: {
    chainId: 41454,
    name: "Monad Testnet",
    rpcUrl: MONAD_RPC_URL,
    explorerUrl: "https://monad-testnet.socialscan.io",
    faucetUrl: "https://testnet.monad.xyz/",
    nativeCurrency: {
      name: "Monad",
      symbol: "MONAD",
      decimals: 18,
    },
  },
  bsc: {
    chainId: 56,
    name: "Binance Smart Chain",
    rpcUrl: BSC_RPC_URL,
    explorerUrl: "https://bscscan.com",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: BASE_SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.basescan.org",
    faucetUrl: "https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

// ERC-20 token addresses per chain
const tokenMap = {
  ethereum: {
    USDC: "0xA0b86a33E6441b8435b662303c0f479c7e1d5b1e",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  monad: {},
  bsc: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
  },
  baseSepolia: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
};

// ERC-20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint256 value) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function burn(uint256 value) public returns (bool)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
];

console.log('🤖 Initializing OpenAI model...');

// Initialize OpenAI model with error handling
let llm;
try {
  llm = new ChatOpenAI({
    model: "gpt-4",
    apiKey: OPENAI_API_KEY,
    temperature: 0,
  });
  console.log('✅ OpenAI model initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize OpenAI model:', error.message);
  process.exit(1);
}

// Multi-chain blockchain tools
class BlockchainTools {
  constructor() {
    this.providers = {};
    this.wallets = {};
    
    // Initialize providers for all chains
    Object.entries(CHAINS).forEach(([chainKey, config]) => {
      this.providers[chainKey] = new ethers.JsonRpcProvider(config.rpcUrl);
      this.wallets[chainKey] = null;
    });
  }

  getProvider(chain) {
    if (!this.providers[chain]) {
      throw new Error(`Chain ${chain} not supported`);
    }
    return this.providers[chain];
  }

  getWallet(chain) {
    return this.wallets[chain] || null;
  }

  setWallet(chain, wallet) {
    if (!this.providers[chain]) {
      throw new Error(`Chain ${chain} not supported`);
    }
    this.wallets[chain] = wallet;
  }

  clearWallet(chain) {
    this.wallets[chain] = null;
    log.info(`Wallet cleared for chain: ${chain}`);
  }

  clearAllWallets() {
    Object.keys(this.wallets).forEach(chain => {
      this.wallets[chain] = null;
    });
    log.info("All wallets cleared");
  }
}

// Validation helper
function validateChain(chain) {
  const normalizedChain = chain.toLowerCase();
  if (!CHAINS[normalizedChain]) {
    throw new Error(`Chain "${chain}" not supported. Available chains: ${Object.keys(CHAINS).join(", ")}`);
  }
  return normalizedChain;
}

// Define tools
class GetTokenPriceTool extends StructuredTool {
  schema = z.object({
    token: z.string().describe("Token ticker (e.g., ETH, BTC, BNB, MONAD)"),
  });

  name = "getTokenPrice";
  description = "Get real-time token price from CoinGecko";

  async _call({ token }) {
    try {
      const tokenMap = {
        'ETH': 'ethereum',
        'BTC': 'bitcoin',
        'BNB': 'binancecoin',
        'MONAD': 'monad',
        'USDC': 'usd-coin',
        'USDT': 'tether',
      };
      
      const coinId = tokenMap[token.toUpperCase()] || token.toLowerCase();
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        { 
          headers: COINGECKO_API_KEY ? { "x-cg-api-key": COINGECKO_API_KEY } : {},
          timeout: 10000 
        }
      );
      
      const price = response.data[coinId]?.usd;
      if (!price) return `Price not found for ${token}`;
      return `💰 **${token.toUpperCase()} Price**: $${price.toLocaleString()} USD`;
    } catch (error) {
      log.error("GetTokenPriceTool error:", error);
      return `Failed to fetch price for ${token}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class GetBalanceTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to check balance on"),
    address: z.string().optional().describe("Address to check (optional, uses connected wallet if not provided)"),
  });

  name = "getBalance";
  description = "Get native token and ERC-20 token balances for a specific chain";

  constructor(tools) {
    super();
    this.tools = tools;
  }

  async _call({ chain, address }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const provider = this.tools.getProvider(validChain);
    
    let targetAddress = address;
    if (!targetAddress) {
      const wallet = this.tools.getWallet(validChain);
      if (!wallet) return `No wallet set for ${chainConfig.name} and no address provided.`;
      targetAddress = wallet.address;
    }

    const balances = [];
    
    try {
      // Native token balance
      const nativeBalance = await provider.getBalance(targetAddress);
      balances.push(`💎 **${chainConfig.nativeCurrency.symbol}**: ${ethers.formatEther(nativeBalance)} ${chainConfig.nativeCurrency.symbol}`);

      // ERC-20 token balances
      const tokens = tokenMap[validChain] || {};
      for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(targetAddress);
          const decimals = await tokenContract.decimals();
          balances.push(`🪙 **${tokenSymbol}**: ${ethers.formatUnits(balance, decimals)} ${tokenSymbol}`);
        } catch (error) {
          log.error(`Error fetching balance for ${tokenSymbol}:`, error);
          balances.push(`🪙 **${tokenSymbol}**: Unable to fetch`);
        }
      }

      return `**💰 ${chainConfig.name} Balances** for \`${targetAddress}\`:\n\n${balances.join("\n")}`;
    } catch (error) {
      log.error("GetBalanceTool error:", error);
      return `Failed to fetch balances: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class HelpTool extends StructuredTool {
  schema = z.object({});

  name = "help";
  description = "List all available commands and features";

  async _call() {
    const commands = [
      "🔍 **Price Commands:**",
      "• `What's the price of ETH?` - Get current token prices",
      "• `Bitcoin price` - Get BTC price",
      "• `Show me BNB price` - Get BNB price",
      "",
      "💰 **Balance Commands:**",
      "• `Check my balance on Base Sepolia` - Check your balances",
      "• `What's my ETH balance?` - Check specific token balance",
      "",
      "🌐 **Supported Networks:**",
      "• Ethereum Mainnet",
      "• Base Sepolia Testnet", 
      "• Binance Smart Chain",
      "• Monad Testnet",
      "",
      "💡 **Tips:**",
      "• Ask questions in natural language",
      "• I can help with blockchain operations",
      "• Specify which network you want to use",
      "",
      "🔐 **Security:**",
      "• Your private keys are never stored",
      "• All operations are secure and encrypted"
    ];
    return commands.join("\n");
  }
}

console.log('🔧 Setting up blockchain tools...');

// Instantiate tools
const blockchainTools = new BlockchainTools();
const tools = [
  new GetTokenPriceTool(),
  new GetBalanceTool(blockchainTools),
  new HelpTool(),
];

console.log('🛠️ Initializing LangChain components...');

const toolNode = new ToolNode(tools);
const modelWithTools = llm.bindTools(tools);

// Define state
const agentState = {
  messages: {
    reducer: (x = [], y = []) => x.concat(y),
    default: () => [],
  },
};

// Agent logic
async function callAgent(state) {
  const systemMessage = new SystemMessage(
    `You are Nexis, an AI-powered Web3 assistant that helps users interact with multiple blockchain networks including Ethereum, Base Sepolia, Binance Smart Chain, and Monad Testnet.

    You can help users with:
    - Getting real-time cryptocurrency prices (ETH, BTC, BNB, etc.)
    - Checking wallet balances across multiple networks
    - Providing blockchain information and guidance
    - Answering questions about Web3 and DeFi

    Key guidelines:
    - Be helpful, friendly, and informative
    - Use emojis and formatting to make responses engaging
    - When users ask about prices, use the getTokenPrice tool
    - When users ask about balances, use the getBalance tool
    - Always prioritize user security and privacy
    - If you don't have specific tools for a request, provide helpful general information

    Available chains: ethereum, baseSepolia, bsc, monad

    Respond in a conversational, helpful manner and make blockchain interactions feel simple and accessible.`
  );
  
  const messagesWithSystem = [systemMessage, ...state.messages];
  const response = await modelWithTools.invoke(messagesWithSystem);
  return { messages: [response] };
}

function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

console.log('🔗 Building workflow graph...');

// Define workflow
const workflow = new StateGraph({ channels: agentState })
  .addNode("agent", callAgent)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

const agent = workflow.compile();

console.log('✅ Agent workflow compiled successfully');

// Create Express app
const app = express();

console.log('🌐 Setting up Express server...');

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'https://nexis.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    openai_configured: !!OPENAI_API_KEY
  });
});

// Main agent endpoint
app.post('/api/agent', async (req, res) => {
  try {
    const { input, privateKey } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    // Validate environment variables
    if (!OPENAI_API_KEY) {
      log.error('OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'AI service not configured. Please check environment variables.' });
    }

    const messages = [];
    
    // If private key is provided, set wallet first
    if (privateKey) {
      const chainMatch = input.toLowerCase().match(/\b(ethereum|monad|bsc|basesepolia)\b/);
      const defaultChain = chainMatch ? chainMatch[1] : 'baseSepolia';
      messages.push(new HumanMessage(`setWallet ${privateKey} ${defaultChain}`));
    }
    
    messages.push(new HumanMessage(input));

    log.info(`Processing request: ${input}`);
    
    const result = await agent.invoke({ messages });
    const lastMessage = result.messages[result.messages.length - 1];
    
    log.info('Request processed successfully');
    
    res.json({ 
      response: lastMessage.content,
      timestamp: new Date().toISOString(),
      chain_support: Object.keys(CHAINS)
    });
    
  } catch (error) {
    log.error("Agent handler error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't expose sensitive error details in production
    const publicError = errorMessage.includes('API key') || errorMessage.includes('unauthorized') 
      ? 'Service temporarily unavailable. Please check API configuration.' 
      : errorMessage;
    
    res.status(500).json({ 
      error: `Failed to process request: ${publicError}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log('🎉 ================================');
  console.log(`🚀 Nexis Agent Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/agent`);
  console.log(`🔑 OpenAI configured: ${!!OPENAI_API_KEY}`);
  console.log(`🌐 CORS enabled for: http://localhost:8080`);
  console.log('✅ Agent ready to process requests');
  console.log('🎉 ================================');
});

// Keep the server alive
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1);
  }
});

// Prevent the process from exiting
setInterval(() => {
  // This keeps the Node.js process alive
}, 1000);

console.log('🔄 Server setup complete, keeping process alive...');

console.log('Current working directory:', process.cwd());
console.log('Environment file path:', envPath);

// Remove the Express server setup and replace with Vercel serverless function
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input, privateKey } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    // Validate environment variables
    if (!OPENAI_API_KEY) {
      log.error('OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'AI service not configured. Please check environment variables.' });
    }

    const messages = [];
    
    // If private key is provided, set wallet first
    if (privateKey) {
      const chainMatch = input.toLowerCase().match(/\b(ethereum|monad|bsc|basesepolia)\b/);
      const defaultChain = chainMatch ? chainMatch[1] : 'baseSepolia';
      messages.push(new HumanMessage(`setWallet ${privateKey} ${defaultChain}`));
    }
    
    messages.push(new HumanMessage(input));

    log.info(`Processing request: ${input}`);
    
    const result = await agent.invoke({ messages });
    const lastMessage = result.messages[result.messages.length - 1];
    
    log.info('Request processed successfully');
    
    res.json({ 
      response: lastMessage.content,
      timestamp: new Date().toISOString(),
      chain_support: Object.keys(CHAINS)
    });
    
  } catch (error) {
    log.error("Agent handler error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't expose sensitive error details in production
    const publicError = errorMessage.includes('API key') || errorMessage.includes('unauthorized') 
      ? 'Service temporarily unavailable. Please check API configuration.' 
      : errorMessage;
    
    res.status(500).json({ 
      error: `Failed to process request: ${publicError}`,
      timestamp: new Date().toISOString()
    });
  }
}