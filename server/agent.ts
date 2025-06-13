
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";
import { ethers } from "ethers";
import axios from "axios";
import { Logger } from "tslog";
import express, { Request, Response, RequestHandler } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";

dotenv.config();

// Logger setup
const log = new Logger({
  name: "NexisMultiChainAgent",
  minLevel: 0,
  prettyLogTemplate: "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}} {{logLevelName}} {{name}} - ",
});

// Debug logging and error handlers
console.log("Starting Nexis Agent Server...");
log.info("Application initializing...");

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  log.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

// Validate OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is not set in .env file");
  log.error("OPENAI_API_KEY is not set. Please configure it in .env file.");
  process.exit(1);
}
log.info("OPENAI_API_KEY: Set");

// Chain configurations
interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const CHAINS: { [key: string]: ChainConfig } = {
  ethereum: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: ETHEREUM_RPC_URL,
    explorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  monad: {
    chainId: 41454,
    name: "Monad Testnet",
    rpcUrl: MONAD_RPC_URL,
    explorerUrl: "https://monad-testnet.socialscan.io",
    faucetUrl: "https://testnet.monad.xyz/",
    nativeCurrency: { name: "Monad", symbol: "MONAD", decimals: 18 },
  },
  bsc: {
    chainId: 56,
    name: "Binance Smart Chain",
    rpcUrl: BSC_RPC_URL,
    explorerUrl: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: BASE_SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.basescan.org",
    faucetUrl: "https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
};

// ERC-20 token addresses per chain
const tokenMap: { [chain: string]: { [symbol: string]: string } } = {
  ethereum: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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
  "function balanceOf(address account) public view returns (uint256)",
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
];

// Initialize OpenAI model
const llm = new ChatOpenAI({
  apiKey: OPENAI_API_KEY,
  modelName: "gpt-4",
  temperature: 0,
});

// Multi-chain blockchain tools
class BlockchainTools {
  private providers: { [chain: string]: ethers.JsonRpcProvider } = {};
  private wallets: { [chain: string]: ethers.Wallet | null } = {};

  constructor() {
    Object.entries(CHAINS).forEach(([chainKey, config]) => {
      this.providers[chainKey] = new ethers.JsonRpcProvider(config.rpcUrl);
      this.wallets[chainKey] = null;
    });
  }

  getProvider(chain: string): ethers.JsonRpcProvider {
    if (!this.providers[chain]) {
      throw new Error(`Chain ${chain} not supported`);
    }
    return this.providers[chain];
  }

  getWallet(chain: string): ethers.Wallet | null {
    return this.wallets[chain] || null;
  }

  setWallet(chain: string, wallet: ethers.Wallet): void {
    if (!this.providers[chain]) {
      throw new Error(`Chain ${chain} not supported`);
    }
    this.wallets[chain] = wallet;
  }

  clearWallet(chain: string): void {
    this.wallets[chain] = null;
    log.info(`Wallet cleared for chain: ${chain}`);
  }

  clearAllWallets(): void {
    Object.keys(this.wallets).forEach(chain => {
      this.wallets[chain] = null;
    });
    log.info("All wallets cleared");
  }
}

// Validation helper
function validateChain(chain: string): string {
  const normalizedChain = chain.toLowerCase();
  if (!CHAINS[normalizedChain]) {
    throw new Error(`Chain "${chain}" not supported. Available chains: ${Object.keys(CHAINS).join(", ")}`);
  }
  return normalizedChain;
}

// Define tools
class SetWalletTool extends StructuredTool {
  schema = z.object({
    privateKey: z.string().describe("The private key to set the wallet"),
    chain: z.string().describe("The blockchain to set the wallet for (ethereum, monad, bsc, baseSepolia)"),
  });

  name = "setWallet";
  description = "Set the wallet using a private key for a specific blockchain. Required before any transactions.";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ privateKey, chain }: { privateKey: string; chain: string }) {
    try {
      const validChain = validateChain(chain);
      const provider = this.tools.getProvider(validChain);
      const wallet = new ethers.Wallet(privateKey, provider);
      this.tools.setWallet(validChain, wallet);
      log.info(`Wallet set for ${validChain}: ${wallet.address}`);
      return `✅ Wallet set for ${CHAINS[validChain].name} at address: ${wallet.address}. You can now perform transactions on this chain.`;
    } catch (error) {
      log.error("SetWalletTool error:", error);
      throw new Error(`Failed to set wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class DisconnectWalletTool extends StructuredTool {
  schema = z.object({
    chain: z.string().nullable().describe("The blockchain to disconnect (null to disconnect all chains)"),
  });

  name = "disconnectWallet";
  description = "Disconnect wallet for a specific chain or all chains if chain is null";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain }: { chain: string | null }) {
    if (chain) {
      const validChain = validateChain(chain);
      this.tools.clearWallet(validChain);
      return `🔌 Wallet disconnected for ${CHAINS[validChain].name}`;
    } else {
      this.tools.clearAllWallets();
      return "🔌 All wallets disconnected successfully";
    }
  }
}

class GetWalletAddressTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to get wallet address for"),
  });

  name = "getWalletAddress";
  description = "Get the current wallet address for a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain }: { chain: string }) {
    const validChain = validateChain(chain);
    const wallet = this.tools.getWallet(validChain);
    if (!wallet) return `🚫 No wallet set for ${CHAINS[validChain].name}. Please set a wallet using 'setWallet' first.`;
    return `📍 ${CHAINS[validChain].name} wallet address: ${wallet.address}`;
  }
}

class GetBalanceTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to check balance on"),
    address: z.string().nullable().describe("Address to check (null to use connected wallet)"),
  });

  name = "getBalance";
  description = "Get native token and ERC-20 token balances for a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, address }: { chain: string; address: string | null }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const provider = this.tools.getProvider(validChain);
    
    let targetAddress = address;
    if (!targetAddress) {
      const wallet = this.tools.getWallet(validChain);
      if (!wallet) return `🚫 No wallet set for ${chainConfig.name} and no address provided. Please set a wallet using 'setWallet' first.`;
      targetAddress = wallet.address;
    }

    const balances: string[] = [];
    
    try {
      const nativeBalance = await provider.getBalance(targetAddress);
      balances.push(`💰 ${chainConfig.nativeCurrency.symbol}: ${ethers.formatEther(nativeBalance)} ${chainConfig.nativeCurrency.symbol}`);

      const tokens = tokenMap[validChain] || {};
      for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(targetAddress);
          const decimals = await tokenContract.decimals();
          balances.push(`🪙 ${tokenSymbol}: ${ethers.formatUnits(balance, decimals)} ${tokenSymbol}`);
        } catch (error) {
          log.error(`Error fetching balance for ${tokenSymbol}:`, error);
          balances.push(`🪙 ${tokenSymbol}: Unable to fetch`);
        }
      }

      return `📊 **${chainConfig.name} Balances** for \`${targetAddress}\`:\n${balances.join("\n")}`;
    } catch (error) {
      log.error("GetBalanceTool error:", error);
      return `❌ Failed to fetch balances: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class TransferTokensTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to transfer on"),
    to: z.string().describe("The recipient address"),
    amount: z.string().describe("The amount of native tokens to transfer"),
  });

  name = "transferTokens";
  description = "Transfer native tokens (ETH, MONAD, BNB) on a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, to, amount }: { chain: string; to: string; amount: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const wallet = this.tools.getWallet(validChain);
    
    if (!wallet) return `🚫 No wallet set for ${chainConfig.name}. Please set a wallet using 'setWallet' first.`;
    
    if (!ethers.isAddress(to)) return `❌ Invalid recipient address: ${to}`;
    if (isNaN(Number(amount)) || Number(amount) <= 0) return `❌ Invalid amount: ${amount}`;

    try {
      const tx = { to, value: ethers.parseEther(amount) };
      const txResponse = await wallet.sendTransaction(tx);
      await txResponse.wait();
      log.info(`Transfer: ${amount} ${chainConfig.nativeCurrency.symbol} to ${to} on ${chainConfig.name}, Tx: ${txResponse.hash}`);
      return `✅ Transferred ${amount} ${chainConfig.nativeCurrency.symbol} to ${to} on ${chainConfig.name}. [View Transaction](${chainConfig.explorerUrl}/tx/${txResponse.hash})`;
    } catch (error) {
      log.error("TransferTokensTool error:", error);
      return `❌ Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class GetTokenPriceTool extends StructuredTool {
  schema = z.object({
    token: z.string().describe("Token ticker (e.g., ETH, BNB, MONAD)"),
  });

  name = "getTokenPrice";
  description = "Get real-time token price from CoinGecko";

  async _call({ token }: { token: string }) {
    try {
      const tokenMap: { [key: string]: string } = {
        'ETH': 'ethereum',
        'BNB': 'binancecoin',
        'MONAD': 'monad',
        'USDC': 'usd-coin',
        'USDT': 'tether',
      };
      const coinId = tokenMap[token.toUpperCase()] || token.toLowerCase();
      log.info(`Fetching price for token: ${token}, coinId: ${coinId}`);
      const response = await axios.get<{ [key: string]: { usd: number } }>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        { headers: COINGECKO_API_KEY ? { "x-cg-api-key": COINGECKO_API_KEY } : {}, timeout: 10000 }
      );
      log.info(`CoinGecko response: ${JSON.stringify(response.data, null, 2)}`);
      const price = response.data[coinId]?.usd;
      if (!price) {
        log.warn(`Price not found for ${token}`);
        return `❌ Price not found for ${token}`;
      }
      return `💰 **${token.toUpperCase()} Price**: $${price.toLocaleString()} USD`;
    } catch (error) {
      log.error("GetTokenPriceTool error:", error);
      return `❌ Failed to fetch price for ${token}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class GetFaucetTokensTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to get faucet tokens for"),
    address: z.string().describe("The wallet address to receive testnet tokens"),
  });

  name = "getFaucetTokens";
  description = "Request testnet tokens from blockchain faucet";

  async _call({ chain, address }: { chain: string; address: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    
    try {
      if (!ethers.isAddress(address)) {
        return "❌ Invalid Ethereum address provided.";
      }
      
      if (!chainConfig.faucetUrl) {
        return `🚫 No faucet available for ${chainConfig.name}.`;
      }
      
      return `💧 To get testnet ${chainConfig.nativeCurrency.symbol} tokens for ${address} on ${chainConfig.name}, visit ${chainConfig.faucetUrl}, connect your wallet, paste your address (${address}), and request tokens. Note: Faucets may have rate limits and eligibility requirements.`;
    } catch (error) {
      log.error("GetFaucetTokensTool error:", error);
      return `❌ Failed to process faucet request: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class HelpTool extends StructuredTool {
  schema = z.object({});

  name = "help";
  description = "List all available commands and features";

  async _call() {
    const commands = [
      "🔐 **Wallet Management**",
      "• setWallet <privateKey> <chain> - Set your wallet for a chain (required for transactions)",
      "• disconnectWallet [chain] - Disconnect wallet (specific chain or all if chain is null)",
      "• getWalletAddress <chain> - Get your wallet address",
      "",
      "💰 **Balance and Transactions**",
      "• getBalance <chain> [address] - Check native and token balances (address is null to use wallet)",
      "• transferTokens <chain> <to> <amount> - Transfer native tokens (e.g., ETH, BNB)",
      "",
      "📊 **Market Information**",
      "• getTokenPrice <token> - Get token price (e.g., ETH, BNB)",
      "",
      "💧 **Testnet Support**",
      "• getFaucetTokens <chain> <address> - Request testnet tokens",
      "",
      "🌐 **Supported Chains**",
      `• ${Object.keys(CHAINS).join(", ")}`,
      "",
      "💡 **General Queries**",
      "• Ask any blockchain or wallet-related question (e.g., 'What is Ethereum?', 'How do gas fees work?')",
      "",
      "🔒 **Security Note**",
      "• Always keep your private key secure and never share it publicly",
      "• Set your wallet before performing transactions",
      "",
      "ℹ️ **Usage**",
      "• Use 'setWallet' first to enable transactions",
      "• Specify the chain for all operations (e.g., 'getBalance baseSepolia')",
    ];
    return `**Nexis Agent Commands**:\n${commands.join("\n")}`;
  }
}

// Instantiate tools
const blockchainTools = new BlockchainTools();
const tools = [
  new SetWalletTool(blockchainTools),
  new DisconnectWalletTool(blockchainTools),
  new GetWalletAddressTool(blockchainTools),
  new GetBalanceTool(blockchainTools),
  new TransferTokensTool(blockchainTools),
  new GetTokenPriceTool(),
  new GetFaucetTokensTool(),
  new HelpTool(),
];

// Initialize agent
const modelWithTools = llm.bindTools(tools);

// Define system prompt
const systemPrompt = new SystemMessage(
  `You are Nexis, a friendly AI-powered Web3 assistant that helps users interact with blockchain networks including Ethereum, Monad Testnet, Binance Smart Chain, and Base Sepolia.

  Your capabilities:
  - Set and manage wallets for secure transactions
  - Check native and ERC-20 token balances
  - Transfer native tokens (ETH, BNB, MONAD)
  - Provide real-time token prices
  - Offer testnet faucet guidance
  - Answer general blockchain and wallet-related questions

  Key guidelines:
  - Always require users to set a wallet with a private key before transactions using the 'setWallet' tool
  - Be clear about which chain is being used; prompt for clarification if not specified
  - Provide helpful, engaging responses with emojis and markdown formatting
  - Prioritize user security; never store private keys and remind users to keep them safe
  - For general blockchain questions, provide accurate and informative answers
  - If a tool is needed, use the appropriate one; otherwise, respond conversationally
  - For price queries (e.g., 'getTokenPrice ETH'), always use the 'getTokenPrice' tool

  Available chains: ethereum, monad, bsc, baseSepolia

  Make blockchain interactions simple, secure, and accessible for users.`
);

// Simple agent invocation
async function invokeAgent(messages: BaseMessage[]) {
  log.info(`invokeAgent messages: ${JSON.stringify(messages.map(m => m.content), null, 2)}`);
  try {
    const response = await modelWithTools.invoke([systemPrompt, ...messages]);
    log.info(`invokeAgent response: ${JSON.stringify({
      content: response.content,
      tool_calls: response.tool_calls || []
    }, null, 2)}`);
    return { messages: [response] };
  } catch (error) {
    log.error("invokeAgent error:", error);
    throw error;
  }
}

// Express setup
const app = express();
app.use(cors({ origin: "https://nexis.vercel.app" }));
app.use(bodyParser.json());

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Nexis Agent backend running",
    version: "1.0.0",
    supported_chains: Object.keys(CHAINS),
    timestamp: new Date().toISOString(),
  });
});

// Define agentHandler
const agentHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    log.info(`Handling ${req.method} request to ${req.url}`);
    const { input, privateKey } = req.body as { input?: string; privateKey?: string };
    
    if (!input) {
      log.warn("Input is missing in request body");
      res.status(400).json({ error: "Input is required", timestamp: new Date().toISOString() });
      return;
    }

    const messages: BaseMessage[] = [];
    
    if (privateKey) {
      const chainMatch = input.toLowerCase().match(/\b(ethereum|monad|bsc|basesepolia)\b/);
      const defaultChain = chainMatch ? chainMatch[1] : "baseSepolia";
      messages.push(new HumanMessage(`setWallet ${privateKey} ${defaultChain}`));
    }
    
    messages.push(new HumanMessage(input));

    log.info(`Processing request: ${input}`);
    
    const result = await invokeAgent(messages);
    const lastMessage = result.messages[result.messages.length - 1];
    
    log.info("Request processed successfully");
    
    res.status(200).json({
      response: lastMessage.content,
      timestamp: new Date().toISOString(),
      chain_support: Object.keys(CHAINS),
    });
  } catch (error) {
    log.error("Handler error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const publicError = errorMessage.includes("API key") || errorMessage.includes("unauthorized")
      ? "Service temporarily unavailable"
      : errorMessage;
    res.status(500).json({
      error: `Failed to process request: ${publicError}`,
      timestamp: new Date().toISOString(),
    });
  }
};

app.post("/agent", agentHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  log.info(`Server running on http://localhost:${PORT}`);
});