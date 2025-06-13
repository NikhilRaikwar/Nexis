import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";
import { ethers } from "ethers";
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";
import express, { Request, Response, RequestHandler } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { Logger } from "tslog";
import cors from "cors";

dotenv.config();

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";

// Chain configurations
const CHAIN_CONFIGS = {
  monad: {
    name: "Monad Testnet",
    rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://monad-testnet.socialscan.io",
    faucetUrl: "https://testnet.monad.xyz/",
    nativeCurrency: "MONAD",
    chainId: 41454,
    isTestnet: true
  },
  ethereum: {
    name: "Ethereum Sepolia",
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    explorerUrl: "https://sepolia.etherscan.io",
    faucetUrl: "https://sepoliafaucet.com/",
    nativeCurrency: "ETH",
    chainId: 11155111,
    isTestnet: true
  },
  base: {
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_RPC_URL || "https://sepolia.base.org",
    explorerUrl: "https://sepolia-explorer.base.org",
    faucetUrl: "https://bridge.base.org/deposit",
    nativeCurrency: "ETH",
    chainId: 84532,
    isTestnet: true
  },
  polygon: {
    name: "Polygon Mumbai",
    rpcUrl: process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com/",
    explorerUrl: "https://mumbai.polygonscan.com",
    faucetUrl: "https://faucet.polygon.technology/",
    nativeCurrency: "MATIC",
    chainId: 80001,
    isTestnet: true
  },
  arbitrum: {
    name: "Arbitrum Sepolia",
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    faucetUrl: "https://bridge.arbitrum.io/",
    nativeCurrency: "ETH",
    chainId: 421614,
    isTestnet: true
  },
  solana: {
    name: "Solana Devnet",
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com",
    faucetUrl: "https://faucet.solana.com/",
    nativeCurrency: "SOL",
    isTestnet: true
  }
};

// Logger setup
const log = new Logger({ name: "NexisMultiChainAgent" });

// Initialize OpenAI model
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: OPENAI_API_KEY,
  temperature: 0.7,
});

// Multi-chain blockchain tools
class MultiChainTools {
  private evmProviders: Map<string, ethers.JsonRpcProvider> = new Map();
  private evmWallets: Map<string, ethers.Wallet> = new Map();
  private solanaConnection: Connection;
  private solanaKeypair: Keypair | null = null;

  constructor() {
    // Initialize EVM providers
    Object.entries(CHAIN_CONFIGS).forEach(([chainKey, config]) => {
      if (chainKey !== 'solana') {
        this.evmProviders.set(chainKey, new ethers.JsonRpcProvider(config.rpcUrl));
      }
    });

    // Initialize Solana connection
    this.solanaConnection = new Connection(CHAIN_CONFIGS.solana.rpcUrl, 'confirmed');
  }

  getEvmProvider(chain: string): ethers.JsonRpcProvider | null {
    return this.evmProviders.get(chain) || null;
  }

  getEvmWallet(chain: string): ethers.Wallet | null {
    return this.evmWallets.get(chain) || null;
  }

  getSolanaConnection(): Connection {
    return this.solanaConnection;
  }

  getSolanaKeypair(): Keypair | null {
    return this.solanaKeypair;
  }

  setEvmWallets(privateKey: string): void {
    this.evmWallets.clear();
    Object.keys(CHAIN_CONFIGS).forEach(chainKey => {
      if (chainKey !== 'solana') {
        const provider = this.evmProviders.get(chainKey);
        if (provider) {
          const wallet = new ethers.Wallet(privateKey, provider);
          this.evmWallets.set(chainKey, wallet);
        }
      }
    });
  }

  setSolanaKeypair(privateKey: string): void {
    try {
      // Support both base58 and array formats
      let secretKey: Uint8Array;
      if (privateKey.includes('[') && privateKey.includes(']')) {
        // Array format [1,2,3,...]
        const numbers = JSON.parse(privateKey);
        secretKey = new Uint8Array(numbers);
      } else {
        // Base58 format
        secretKey = bs58.decode(privateKey);
      }
      this.solanaKeypair = Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error(`Invalid Solana private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  clearWallets(): void {
    this.evmWallets.clear();
    this.solanaKeypair = null;
    log.info("All wallets cleared from memory");
  }

  getConnectedChains(): string[] {
    const chains: string[] = [];
    this.evmWallets.forEach((_, chain) => chains.push(chain));
    if (this.solanaKeypair) chains.push('solana');
    return chains;
  }
}

// Enhanced wallet management tools
class SetWalletTool extends StructuredTool {
  schema = z.object({
    evmPrivateKey: z.string().optional().describe("The EVM private key for Ethereum-compatible chains"),
    solanaPrivateKey: z.string().optional().describe("The Solana private key (base58 or array format)"),
  });

  name = "setWallet";
  description = "Set wallets using private keys. Supports both EVM chains and Solana. At least one key must be provided.";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call({ evmPrivateKey, solanaPrivateKey }: { evmPrivateKey?: string; solanaPrivateKey?: string }) {
    try {
      if (!evmPrivateKey && !solanaPrivateKey) {
        return "Please provide at least one private key (EVM or Solana).";
      }

      const results: string[] = [];

      // Set EVM wallets
      if (evmPrivateKey) {
        this.tools.setEvmWallets(evmPrivateKey);
        const wallet = this.tools.getEvmWallet('monad');
        if (wallet) {
          results.push(`EVM wallets connected to address: ${wallet.address}`);
          results.push(`Supported EVM chains: ${Object.keys(CHAIN_CONFIGS).filter(k => k !== 'solana').join(', ')}`);
        }
      }

      // Set Solana wallet
      if (solanaPrivateKey) {
        this.tools.setSolanaKeypair(solanaPrivateKey);
        const keypair = this.tools.getSolanaKeypair();
        if (keypair) {
          results.push(`Solana wallet connected to address: ${keypair.publicKey.toBase58()}`);
        }
      }

      log.info(`Wallets connected for chains: ${this.tools.getConnectedChains().join(', ')}`);
      return results.join('\n');
    } catch (error) {
      log.error("SetWalletTool error:", error);
      throw new Error(`Failed to set wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class DisconnectWalletTool extends StructuredTool {
  schema = z.object({});

  name = "disconnectWallet";
  description = "Disconnect all wallets and clear them from memory";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call() {
    this.tools.clearWallets();
    return "All wallets disconnected successfully";
  }
}

class GetWalletAddressTool extends StructuredTool {
  schema = z.object({});

  name = "getWalletAddress";
  description = "Get all connected wallet addresses across all chains";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call() {
    const addresses: string[] = [];
    
    // EVM addresses
    Object.keys(CHAIN_CONFIGS).forEach(chainKey => {
      if (chainKey !== 'solana') {
        const wallet = this.tools.getEvmWallet(chainKey);
        if (wallet) {
          addresses.push(`${CHAIN_CONFIGS[chainKey as keyof typeof CHAIN_CONFIGS].name}: ${wallet.address}`);
        }
      }
    });

    // Solana address
    const solanaKeypair = this.tools.getSolanaKeypair();
    if (solanaKeypair) {
      addresses.push(`${CHAIN_CONFIGS.solana.name}: ${solanaKeypair.publicKey.toBase58()}`);
    }

    if (addresses.length === 0) {
      return "No wallets connected. Please connect your wallets first.";
    }

    return `Connected wallet addresses:\n${addresses.join('\n')}`;
  }
}

class GetAllBalancesTool extends StructuredTool {
  schema = z.object({});

  name = "getAllBalances";
  description = "Get native token balances across all connected chains";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call() {
    const balances: string[] = [];
    
    // Get EVM balances
    for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
      if (chainKey !== 'solana') {
        const wallet = this.tools.getEvmWallet(chainKey);
        if (wallet) {
          try {
            const provider = this.tools.getEvmProvider(chainKey);
            if (provider) {
              const balance = await provider.getBalance(wallet.address);
              balances.push(`${config.name}: ${ethers.formatEther(balance)} ${config.nativeCurrency}`);
            }
          } catch (error) {
            balances.push(`${config.name}: Error fetching balance`);
          }
        }
      }
    }

    // Get Solana balance
    const solanaKeypair = this.tools.getSolanaKeypair();
    if (solanaKeypair) {
      try {
        const balance = await this.tools.getSolanaConnection().getBalance(solanaKeypair.publicKey);
        balances.push(`${CHAIN_CONFIGS.solana.name}: ${balance / LAMPORTS_PER_SOL} SOL`);
      } catch (error) {
        balances.push(`${CHAIN_CONFIGS.solana.name}: Error fetching balance`);
      }
    }

    if (balances.length === 0) {
      return "No wallets connected. Please connect your wallets first.";
    }

    return `Token Balances Across All Chains:\n${balances.join('\n')}`;
  }
}

class SmartTransferTool extends StructuredTool {
  schema = z.object({
    instruction: z.string().describe("Natural language instruction for the transfer (e.g., 'send 0.1 ETH to 0x123... on Base', 'transfer 0.5 SOL to ABC...')"),
  });

  name = "smartTransfer";
  description = "Execute token transfers using natural language instructions. Auto-detects chain, amount, and recipient.";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call({ instruction }: { instruction: string }) {
    try {
      // Parse the instruction using AI
      const parseResponse = await llm.invoke([
        new SystemMessage(`Parse this transfer instruction and extract:
        - amount: numerical amount to transfer
        - token: token symbol (ETH, SOL, MONAD, MATIC, etc.)
        - chain: blockchain name (ethereum, base, solana, monad, polygon, arbitrum)
        - recipient: destination address
        
        Respond in JSON format: {"amount": "0.1", "token": "ETH", "chain": "base", "recipient": "0x..."}
        If any field cannot be determined, use null.`),
        new HumanMessage(instruction)
      ]);

      let parsedData;
      try {
        const content = parseResponse.content as string;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (error) {
        return `Failed to parse transfer instruction. Please be more specific with format like: "send 0.1 ETH to 0x123... on Base"`;
      }

      const { amount, token, chain, recipient } = parsedData;

      if (!amount || !recipient) {
        return "Please specify both amount and recipient address in your instruction.";
      }

      // Auto-detect chain if not specified
      let targetChain = chain?.toLowerCase();
      if (!targetChain) {
        // Try to detect based on token
        if (token?.toUpperCase() === 'SOL') targetChain = 'solana';
        else if (token?.toUpperCase() === 'MONAD') targetChain = 'monad';
        else if (token?.toUpperCase() === 'MATIC') targetChain = 'polygon';
        else targetChain = 'ethereum'; // Default to Ethereum for ETH
      }

      // Execute transfer based on chain
      if (targetChain === 'solana') {
        return await this.transferSolana(recipient, amount);
      } else {
        return await this.transferEvm(targetChain, recipient, amount);
      }

    } catch (error) {
      log.error("SmartTransferTool error:", error);
      return `Transfer failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async transferEvm(chain: string, to: string, amount: string): Promise<string> {
    const wallet = this.tools.getEvmWallet(chain);
    if (!wallet) {
      return `No wallet connected for ${chain}. Please connect your EVM wallet first.`;
    }

    if (!ethers.isAddress(to)) {
      return "Invalid recipient address provided.";
    }

    try {
      const tx = { to, value: ethers.parseEther(amount) };
      const txResponse = await wallet.sendTransaction(tx);
      await txResponse.wait();
      
      const config = CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS];
      log.info(`Transfer: ${amount} ${config.nativeCurrency} to ${to} on ${chain}, Tx: ${txResponse.hash}`);
      return `Successfully transferred ${amount} ${config.nativeCurrency} to ${to} on ${config.name}.\nTransaction: ${config.explorerUrl}/tx/${txResponse.hash}`;
    } catch (error) {
      throw new Error(`Failed to transfer on ${chain}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async transferSolana(to: string, amount: string): Promise<string> {
    const keypair = this.tools.getSolanaKeypair();
    if (!keypair) {
      return "No Solana wallet connected. Please connect your Solana wallet first.";
    }

    try {
      const toPublicKey = new PublicKey(to);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      const signature = await this.tools.getSolanaConnection().sendTransaction(transaction, [keypair]);
      await this.tools.getSolanaConnection().confirmTransaction(signature);

      log.info(`Solana transfer: ${amount} SOL to ${to}, Signature: ${signature}`);
      return `Successfully transferred ${amount} SOL to ${to} on Solana Devnet.\nTransaction: ${CHAIN_CONFIGS.solana.explorerUrl}/tx/${signature}?cluster=devnet`;
    } catch (error) {
      throw new Error(`Failed to transfer SOL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class GetGasPricesTool extends StructuredTool {
  schema = z.object({});

  name = "getGasPrices";
  description = "Get current gas prices across all EVM chains";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call() {
    const gasPrices: string[] = [];
    
    for (const [chainKey, config] of Object.entries(CHAIN_CONFIGS)) {
      if (chainKey !== 'solana') {
        try {
          const provider = this.tools.getEvmProvider(chainKey);
          if (provider) {
            const feeData = await provider.getFeeData();
            const gasPrice = feeData.gasPrice;
            if (gasPrice) {
              gasPrices.push(`${config.name}: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
            }
          }
        } catch (error) {
          gasPrices.push(`${config.name}: Error fetching gas price`);
        }
      }
    }

    if (gasPrices.length === 0) {
      return "Unable to fetch gas prices from any chain.";
    }

    return `Current Gas Prices:\n${gasPrices.join('\n')}`;
  }
}

class GetTokenPriceTool extends StructuredTool {
  schema = z.object({
    tokens: z.string().describe("Comma-separated token tickers (e.g., 'bitcoin,ethereum,solana,polygon,monad')"),
  });

  name = "getTokenPrices";
  description = "Get real-time token prices from CoinGecko for multiple tokens";

  async _call({ tokens }: { tokens: string }) {
    try {
      const tokenList = tokens.toLowerCase().split(',').map(t => t.trim());
      const tokenIds = tokenList.join(',');
      
      const response = await axios.get<{ [key: string]: { usd: number } }>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds}&vs_currencies=usd`,
        { 
          headers: COINGECKO_API_KEY ? { "x-cg-api-key": COINGECKO_API_KEY } : {},
          timeout: 10000 
        }
      );
      
      const prices: string[] = [];
      tokenList.forEach(token => {
        const price = response.data[token]?.usd;
        if (price) {
          prices.push(`${token.toUpperCase()}: $${price.toLocaleString()} USD`);
        } else {
          prices.push(`${token.toUpperCase()}: Price not found`);
        }
      });

      return `Current Token Prices:\n${prices.join('\n')}`;
    } catch (error) {
      log.error("GetTokenPriceTool error:", error);
      return `Failed to fetch token prices: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class GetMultiChainFaucetTool extends StructuredTool {
  schema = z.object({
    chains: z.string().optional().describe("Comma-separated chain names (optional, shows all if not provided)"),
  });

  name = "getFaucetTokens";
  description = "Get instructions for requesting testnet tokens from faucets across multiple chains";

  constructor(private tools: MultiChainTools) {
    super();
  }

  async _call({ chains }: { chains?: string }) {
    try {
      const targetChains = chains ? chains.split(',').map(c => c.trim().toLowerCase()) : Object.keys(CHAIN_CONFIGS);
      const faucetInstructions: string[] = [];

      targetChains.forEach(chainKey => {
        const config = CHAIN_CONFIGS[chainKey as keyof typeof CHAIN_CONFIGS];
        if (!config) return;

        let address = "No wallet connected";
        
        if (chainKey === 'solana') {
          const keypair = this.tools.getSolanaKeypair();
          if (keypair) address = keypair.publicKey.toBase58();
        } else {
          const wallet = this.tools.getEvmWallet(chainKey);
          if (wallet) address = wallet.address;
        }

        faucetInstructions.push(`
🔸 **${config.name}**
   Address: ${address}
   Faucet: ${config.faucetUrl}
   Token: ${config.nativeCurrency}`);
      });

      if (faucetInstructions.length === 0) {
        return "No valid chains specified.";
      }

      return `**Multi-Chain Testnet Faucets:**${faucetInstructions.join('\n')}

💡 **Tips:**
• Make sure your wallets are connected to see your addresses
• Some faucets may require Discord verification or social media activity
• Testnet tokens have no real value - they're for development only
• Visit each faucet link and follow their specific instructions`;
    } catch (error) {
      log.error("GetMultiChainFaucetTool error:", error);
      return `Failed to get faucet information: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class Web3QuestionTool extends StructuredTool {
  schema = z.object({
    question: z.string().describe("Web3, blockchain, or coding question"),
  });

  name = "web3Question";
  description = "Answer Web3, blockchain, or coding related questions using AI with multi-chain expertise";

  async _call({ question }: { question: string }) {
    try {
      const response = await llm.invoke([
        new SystemMessage(`You are Nexis, an expert AI assistant specialized in multi-chain Web3 and blockchain technologies. You have deep knowledge of:

**Supported Chains:**
- Monad (Testnet) - High-performance EVM-compatible chain
- Ethereum (Sepolia Testnet) - Leading smart contract platform
- Base (Sepolia) - Coinbase's L2 solution built on Optimism
- Polygon (Mumbai) - Ethereum scaling solution
- Arbitrum (Sepolia) - Optimistic rollup L2
- Solana (Devnet) - High-speed, low-cost blockchain

**Core Expertise:**
- Multi-chain architecture and interoperability
- Smart contracts development (Solidity, Rust)
- DeFi protocols and cross-chain bridges
- NFTs and digital assets
- Blockchain security and best practices
- Web3 development tools and frameworks
- Token economics and governance

**Current Capabilities:**
- Multi-chain wallet management
- Cross-chain token transfers
- Real-time price data and gas tracking
- Testnet faucet access across all supported chains
- Natural language transaction processing

Always provide practical, actionable information with multi-chain context when relevant. Include specific examples and code snippets when helpful.`),
        new HumanMessage(question)
      ]);
      
      return response.content;
    } catch (error) {
      log.error("Web3QuestionTool error:", error);
      return `I apologize, but I encountered an error while processing your question: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class HelpTool extends StructuredTool {
  schema = z.object({});

  name = "help";
  description = "List all available commands and capabilities for the multi-chain agent";

  async _call() {
    const commands = [
      "🌐 **Multi-Chain Nexis Agent - Your Web3 Assistant**",
      "",
      "🔗 **Supported Networks:**",
      "  • Monad Testnet - High-performance EVM chain",
      "  • Ethereum Sepolia - Leading smart contract platform", 
      "  • Base Sepolia - Coinbase's L2 solution",
      "  • Polygon Mumbai - Ethereum scaling solution",
      "  • Arbitrum Sepolia - Optimistic rollup L2",
      "  • Solana Devnet - High-speed, low-cost blockchain",
      "",
      "🔐 **Wallet Management:**",
      "  • setWallet - Connect EVM and/or Solana wallets",
      "    - evmPrivateKey: for Ethereum-compatible chains",
      "    - solanaPrivateKey: for Solana (base58 or array format)",
      "  • disconnectWallet - Disconnect all wallets",
      "  • getWalletAddress - Show all connected addresses",
      "",
      "💰 **Multi-Chain Operations:**",
      "  • getAllBalances - View balances across all chains",
      "  • smartTransfer - Natural language transfers",
      "    Example: 'send 0.1 ETH to 0x123... on Base'",
      "  • getGasPrices - Current gas prices across EVM chains",
      "",
      "🌊 **Multi-Chain Faucets:**",
      "  • getFaucetTokens - Get testnet tokens from all supported faucets",
      "",
      "📊 **Market Data:**",
      "  • getTokenPrices - Multi-token price lookup",
      "    Example: 'bitcoin,ethereum,solana,polygon'",
      "",
      "🤖 **AI Assistant:**",
      "  • web3Question - Ask anything about Web3, DeFi, smart contracts",
      "  • help - Show this comprehensive help menu",
      "",
      "🚀 **Smart Features:**",
      "  • Auto-detects chains based on context",
      "  • Natural language transaction processing",
      "  • Cross-chain balance monitoring",
      "  • Unified multi-chain wallet management",
      "",
      "💡 **Example Commands:**",
      "  • 'Show my balances' - View all chain balances",
      "  • 'Send 0.5 SOL to ABC123...' - Solana transfer",
      "  • 'Transfer 0.1 ETH to 0x456... on Base' - Base transfer",
      "  • 'What are current gas prices?' - All chain gas info",
      "  • 'Get faucet tokens for ethereum,solana' - Specific faucets",
    ];
    return commands.join("\n");
  }
}

// Instantiate tools
const multiChainTools = new MultiChainTools();
const tools = [
  new SetWalletTool(multiChainTools),
  new DisconnectWalletTool(multiChainTools),
  new GetWalletAddressTool(multiChainTools),
  new GetAllBalancesTool(multiChainTools),
  new SmartTransferTool(multiChainTools),
  new GetGasPricesTool(multiChainTools),
  new GetTokenPriceTool(),
  new GetMultiChainFaucetTool(multiChainTools),
  new Web3QuestionTool(),
  new HelpTool(),
];

const toolNode = new ToolNode(tools);
const modelWithTools = llm.bindTools(tools);

// Define state
interface AgentState {
  messages: BaseMessage[];
}

// Enhanced agent logic
async function callAgent(state: AgentState): Promise<Partial<AgentState>> {
  const systemMessage = new SystemMessage(
    `You are Nexis, an advanced AI assistant specialized in multi-chain Web3 and blockchain technologies. 

**Your Mission:**
Nexis empowers users to seamlessly interact with multiple blockchain networks through a unified, intelligent interface. You provide expert guidance and execute operations across Monad, Ethereum, Base, Polygon, Arbitrum, and Solana networks.

**Core Capabilities:**
- Multi-chain wallet management and operations
- Natural language transaction processing
- Cross-chain balance monitoring and analysis
- Real-time market data and gas price tracking
- Comprehensive Web3 education and support
- Testnet faucet coordination across all supported chains

**Supported Networks:**
🔗 Monad Testnet - Next-gen high-performance EVM chain
🔗 Ethereum Sepolia - Industry-leading smart contract platform
🔗 Base Sepolia - Coinbase's optimized L2 solution
🔗 Polygon Mumbai - Ethereum scaling with low fees
🔗 Arbitrum Sepolia - Fast optimistic rollup technology
🔗 Solana Devnet - Ultra-fast, low-cost blockchain

**Interaction Philosophy:**
- Understand user intent through natural language
- Provide clear, actionable guidance
- Maintain security best practices
- Offer educational context when helpful
- Support both beginners and advanced users

**Security Priorities:**
- Never store or log private keys
- Always verify addresses and amounts
- Provide transaction confirmations with explorer links
- Educate users about testnet vs mainnet differences

You are knowledgeable, helpful, and security-conscious. Always prioritize user safety while enabling powerful multi-chain Web3 interactions.`
  );
  
  const messagesWithSystem = [systemMessage, ...state.messages];
  const response = await modelWithTools.invoke(messagesWithSystem);
  return { messages: [response] };
}

function shouldContinue(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

// Define workflow
const workflow = new StateGraph<AgentState>({
  channels: {
    messages: {
      reducer: (x?: BaseMessage[], y?: BaseMessage[]) => (x ?? []).concat(y ?? []),
      default: () => [],
    },
  },
})
  .addNode("agent", callAgent)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

const agent = workflow.compile();

const app = express();

// Enhanced agent handler with multi-chain support
const agentHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const { input, evmPrivateKey, solanaPrivateKey } = req.body as { 
    input?: string; 
    evmPrivateKey?: string; 
    solanaPrivateKey?: string; 
  };
  
  if (!input) {
    res.status(400).json({ error: "Input is required" });
    return;
  }

  try {
    const messages: BaseMessage[] = [];
    
    // Auto-connect wallets if private keys are provided
    if (evmPrivateKey || solanaPrivateKey) {
      const walletParams: any = {};
      if (evmPrivateKey) walletParams.evmPrivateKey = evmPrivateKey;
      if (solanaPrivateKey) walletParams.solanaPrivateKey = solanaPrivateKey;
      
      // Create wallet connection message
      const walletMessage = `setWallet ${JSON.stringify(walletParams)}`;
      messages.push(new HumanMessage(walletMessage));
    }
    
    messages.push(new HumanMessage(input));

    const result = await agent.invoke({ messages });
    const lastMessage = result.messages[result.messages.length - 1];
    
    res.json({ 
      response: lastMessage.content,
      agent: "Nexis Multi-Chain Agent",
      version: "2.0.0",
      supportedChains: Object.keys(CHAIN_CONFIGS),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error("Agent handler error:", error);
    res.status(500).json({ 
      error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      agent: "Nexis Multi-Chain Agent"
    });
  }
};

// Setup Express with enhanced CORS and routes
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from your frontend domains
    const allowedOrigins = [
      "https://nexis-mocha.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173", // Vite default
      "http://localhost:8080"  // Additional dev port
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced routes
app.get("/", (req: Request, res: Response) => {
  res.json({ 
    message: "Welcome to Nexis Multi-Chain Agent! 🌐🚀", 
    description: "Your intelligent AI assistant for seamless multi-chain Web3 interactions",
    version: "2.0.0",
    supportedChains: {
      evm: [
        { name: "Monad Testnet", key: "monad", currency: "MONAD" },
        { name: "Ethereum Sepolia", key: "ethereum", currency: "ETH" },
        { name: "Base Sepolia", key: "base", currency: "ETH" },
        { name: "Polygon Mumbai", key: "polygon", currency: "MATIC" },
        { name: "Arbitrum Sepolia", key: "arbitrum", currency: "ETH" }
      ],
      nonEvm: [
        { name: "Solana Devnet", key: "solana", currency: "SOL" }
      ]
    },
    features: [
      "Multi-chain wallet management",
      "Natural language transactions",
      "Cross-chain balance monitoring",
      "Real-time price and gas tracking",
      "Intelligent faucet coordination",
      "Comprehensive Web3 assistance"
    ],
    endpoints: {
      agent: "POST /agent - Interact with the Nexis multi-chain agent",
      health: "GET /health - Check service health and supported chains",
      chains: "GET /chains - Get detailed chain information"
    }
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "healthy", 
    agent: "Nexis Multi-Chain Agent",
    version: "2.0.0",
    chains: {
      evm: Object.keys(CHAIN_CONFIGS).filter(k => k !== 'solana').length,
      nonEvm: 1,
      total: Object.keys(CHAIN_CONFIGS).length
    },
    features: ["multi-chain", "natural-language", "ai-powered"],
    timestamp: new Date().toISOString()
  });
});

app.get("/chains", (req: Request, res: Response) => {
  res.json({
    supportedChains: CHAIN_CONFIGS,
    capabilities: {
      walletManagement: "Connect EVM and Solana wallets simultaneously",
      balanceTracking: "Monitor native tokens across all chains",
      transfers: "Execute transfers using natural language",
      gasPrices: "Real-time gas price monitoring for EVM chains",
      faucets: "Access testnet faucets across all supported networks",
      priceData: "Multi-token price tracking via CoinGecko"
    },
    usage: {
      connectWallet: "POST /agent with evmPrivateKey and/or solanaPrivateKey",
      checkBalances: "Send 'show my balances' or 'getAllBalances'",
      transfer: "Send 'transfer 0.1 ETH to 0x123... on Base'",
      help: "Send 'help' for complete command list"
    }
  });
});

app.post("/agent", agentHandler);

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
  log.error("Unhandled error:", error);
  res.status(500).json({ 
    error: "Internal server error",
    message: error.message,
    agent: "Nexis Multi-Chain Agent",
    version: "2.0.0"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log.info(`🌐 Nexis Multi-Chain Agent running on port ${PORT}`);
  log.info(`🚀 Version: 2.0.0 - Multi-Chain Web3 Assistant`);
  log.info(`🔗 Supported EVM Chains: ${Object.keys(CHAIN_CONFIGS).filter(k => k !== 'solana').length}`);
  log.info(`🔗 Supported Non-EVM Chains: 1 (Solana)`);
  log.info(`⚡ Features: Multi-chain wallets, Natural language transactions, AI-powered assistance`);
  
  // Display chain information
  Object.entries(CHAIN_CONFIGS).forEach(([key, config]) => {
    log.info(`   • ${config.name} (${config.nativeCurrency})`);
  });
  
  log.info(`🔧 Ready to serve multi-chain Web3 operations!`);
});

export default app;
