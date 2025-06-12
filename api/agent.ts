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
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Logger setup
const log = new Logger({ name: "NexisMultiChainAgent" });

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/your-api-key";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

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
const tokenMap: { [chain: string]: { [symbol: string]: string } } = {
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

// ERC-20 Token Bytecode (simplified version for deployment)
const TOKEN_BYTECODE = "0x608060405234801561001057600080fd5b506040516108a93803806108a98339818101604052810190610032919061028a565b82600390816100419190610531565b5081600490816100519190610531565b508060008190555080600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055503373ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516100fb9190610612565b60405180910390a35050506106c8565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61017082610127565b810181811067ffffffffffffffff8211171561018f5761018e610138565b5b80604052505050565b60006101a261010e565b90506101ae8282610167565b919050565b600067ffffffffffffffff8211156101ce576101cd610138565b5b6101d782610127565b9050602081019050919050565b60006101f76101f2846101b3565b610198565b90508281526020810184848401111561021357610212610122565b5b61021e84828561025b565b509392505050565b600082601f83011261023b5761023a61011d565b5b815161024b8482602086016101e4565b91505092915050565b6000819050919050565b61026781610254565b811461027257600080fd5b50565b6000815190506102848161025e565b92915050565b6000806000606084860312156102a3576102a2610118565b5b600084015167ffffffffffffffff8111156102c1576102c061011d565b5b6102cd86828701610226565b935050602084015167ffffffffffffffff8111156102ee576102ed61011d565b5b6102fa86828701610226565b925050604061030b86828701610275565b9150509250925092565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061036757607f821691505b60208210810361037a57610379610320565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026103e27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826103a5565b6103ec86836103a5565b95508019841693508086168417925050509392505050565b6000819050919050565b600061042961042461041f84610254565b610404565b610254565b9050919050565b6000819050919050565b6104438361040e565b61045761044f82610430565b8484546103b2565b825550505050565b600090565b61046c61045f565b61047781848461043a565b505050565b5b8181101561049b57610490600082610464565b60018101905061047d565b5050565b601f8211156104e0576104b181610380565b6104ba84610395565b810160208510156104c9578190505b6104dd6104d585610395565b83018261047c565b50505b505050565b600082821c905092915050565b6000610503600019846008026104e5565b1980831691505092915050565b600061051c83836104f2565b9150826002028217905092915050565b61053582610315565b67ffffffffffffffff81111561054e5761054d610138565b5b610558825461034f565b61056382828561049f565b600060209050601f8311600181146105965760008415610584578287015190505b61058e8582610510565b8655506105f6565b601f1984166105a486610380565b60005b828110156105cc578489015182556001820191506020850194506020810190506105a7565b868310156105e957848901516105e5601f8916826104f2565b8355505b6001600288020188555050505b505050505050565b61060781610254565b82525050565b600060208201905061062260008301846105fe565b92915050565b6101d2806106376000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806306fdde031461005c578063095ea7b31461007a57806318160ddd146100aa57806323b872dd146100c857806370a08231146100f8578063a9059cbb14610128575b600080fd5b610064610158565b6040516100719190610c9d565b60405180910390f35b610094600480360381019061008f9190610d58565b6101ea565b6040516100a19190610db3565b60405180910390f35b6100b26102dc565b6040516100bf9190610ddd565b60405180910390f35b6100e260048036038101906100dd9190610df8565b6102e2565b6040516100ef9190610db3565b60405180910390f35b610112600480360381019061010d9190610e4b565b610491565b60405161011f9190610ddd565b60405180910390f35b610142600480360381019061013d9190610d58565b6104d9565b60405161014f9190610db3565b60405180910390f35b60606003805461016790610ea7565b80601f016020809104026020016040519081016040528092919081815260200182805461019390610ea7565b80156101e05780601f106101b5576101008083540402835291602001916101e0565b820191906000526020600020905b8154815290600101906020018083116101c357829003601f168201915b5050505050905090565b600081600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516102ca9190610ddd565b60405180910390a36001905092915050565b60005481565b6000600660008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050828110156103a9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103a090610f24565b60405180910390fd5b82816103b59190610f73565b600660008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555061044084848461062e565b600190509392505050565b6000600560008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60006104e633848461062e565b6001905092915050565b6000600560008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050828110156105775760405180910390fd5b82816105839190610f73565b600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508260056000600073ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461061691906110a7565b925050819055506001905092915050565b505050565b600081519050919050565b600082825260208201905092915050565b60005b8381101561066657808201518184015260208101905061064b565b60008484015250505050565b6000601f19601f8301169050919050565b600061068e82610632565b610698818561063d565b93506106a881856020860161064e565b6106b181610672565b840191505092915050565b600060208201905081810360008301526106d68184610683565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061070e826106e3565b9050919050565b61071e81610703565b811461072957600080fd5b50565b60008135905061073b81610715565b92915050565b6000819050919050565b61075481610741565b811461075f57600080fd5b50565b6000813590506107718161074b565b92915050565b6000806040838503121561078e5761078d6106de565b5b600061079c8582860161072c565b92505060206107ad85828601610762565b9150509250929050565b60008115159050919050565b6107cc816107b7565b82525050565b60006020820190506107e760008301846107c3565b92915050565b6107f681610741565b82525050565b600060208201905061081160008301846107ed565b92915050565b60008060006060848603121561083057610830f6106de565b5b600061083e8682870161072c565b935050602061084f8682870161072c565b925050604061086086828701610762565b9150509250925092565b60006020828403121561088057610880f6106de565b5b600061088e8482850161072c565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806108df57607f821691505b6020821081036108f2576108f1610898565b5b50919050565b7f496e73756666696369656e7420616c6c6f77616e636500000000000000000000600082015250565b600061092e60168361063d565b9150610939826108f8565b602082019050919050565b6000602082019050818103600083015261095d81610921565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061099e82610741565b91506109a983610741565b92508282039050818111156109c1576109c0610964565b5b92915050565b60006109d282610741565b91506109dd83610741565b92508282019050808211156109f5576109f4610964565b5b92915050565b50505050565b50505050565b600081905092915050565b50505050565b6000610a2382610a07565b9150610a2f8385610a11565b9150610a3b8284610a11565b91508190509392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b6000610a8182610741565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610ab357610ab2610964565b5b600182019050919050565b600081905092915050565b6000610ad482610632565b610ade8185610abe565b9350610aee81856020860161064e565b80840191505092915050565b6000610b068284610ac9565b915081905092915050565b600081519050610b208161074b565b92915050565b600060208284031215610b3c57610b3b6106de565b5b6000610b4a84828501610b11565b91505092915050565b6000610b5e82610741565b9150610b6983610741565b9250828202610b7781610741565b91508282048414831517610b8e57610b8d610964565b5b5092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b6000610bcf82610741565b9150610bda83610741565b925082610bea57610be9610b95565b5b828204905092915050565b6000610c0082610741565b9150610c0b83610741565b925082610c1b57610c1a610b95565b5b828206905092915050565b600081905092915050565b6000819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f60088302610c8e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610c51565b610c988683610c51565b95508019841693508086168417925050509392505050565b5f819050919050565b5f610cd3610cce610cc984610741565b610cb0565b610741565b9050919050565b5f819050919050565b610cec83610cb9565b610d00610cf882610cda565b848454610c5e565b825550505050565b5f90565b610d14610d08565b610d1f818484610ce3565b505050565b5b81811015610d4257610d375f82610d0c565b600181019050610d25565b5050565b601f821115610d8757610d5881610c31565b610d6184610c44565b81016020851015610d70578190505b610d84610d7c85610c44565b830182610d24565b50505b505050565b5f82821c905092915050565b5f610da75f1984600802610d8c565b1980831691505092915050565b5f610dbf8383610d98565b9150826002028217905092915050565b610dd882610632565b67ffffffffffffffff811115610df157610df0610e78565b5b610dfb82546108c7565b610e06828285610d46565b5f60209050601f831160018114610e375f8415610e25578287015190505b610e2f8582610db4565b865550610e96565b601f198416610e4586610c31565b5f5b82811015610e6c57848901518255600182019150602085019450602081019050610e47565b86831015610e895784890151610e85601f891682610d98565b8355505b6001600288020188555050505b505050505050565b5f6020820190508181035f830152610eb68184610683565b905092915050565b5f604082019050610ed15f830185610703565b610ede60208301846107ed565b9392505050565b610eee81610703565b8114610ef957600080fd5b50565b5f81359050610f0a81610ee5565b92915050565b5f60208284031215610f2557610f246106de565b5b5f610f3284828501610efb565b91505092915050565b7f496e73756666696369656e742062616c616e636500000000000000000000000000600082015250565b5f610f7160148361063d565b9150610f7c82610f3b565b602082019050919050565b5f6020820190508181035f830152610f9e81610f64565b9050919050565b5f610faf82610741565b9150610fba83610741565b9250828203905081811115610fd257610fd1610964565b5b92915050565b5f610fe282610741565b9150610fed83610741565b925082820190508082111561100557611004610964565b5b92915050565b5f81905092915050565b50505050565b5f6110265f8361100b565b915061103182611015565b5f82019050919050565b5f6110458261101a565b9150819050919050565b7f4275726e20616d6f756e74206578636565647320746f74616c20737570706c7900600082015250565b5f611085601f8361063d565b91506110908261104f565b602082019050919050565b5f6020820190508181035f8301526110b281611078565b905091905056fea2646970667358221220c7c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c864736f6c63430008140033";

// Initialize OpenAI model
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: OPENAI_API_KEY,
  temperature: 0,
});

// Multi-chain blockchain tools
class BlockchainTools {
  private providers: { [chain: string]: ethers.JsonRpcProvider } = {};
  private wallets: { [chain: string]: ethers.Wallet | null } = {};

  constructor() {
    // Initialize providers for all chains
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
  description = "Set the wallet using a private key for a specific blockchain";

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
      return `Wallet set for ${CHAINS[validChain].name} at address: ${wallet.address}`;
    } catch (error) {
      log.error("SetWalletTool error:", error);
      throw new Error(`Failed to set wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class DisconnectWalletTool extends StructuredTool {
  schema = z.object({
    chain: z.string().optional().describe("The blockchain to disconnect (optional, disconnects all if not specified)"),
  });

  name = "disconnectWallet";
  description = "Disconnect wallet for a specific chain or all chains";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain }: { chain?: string }) {
    if (chain) {
      const validChain = validateChain(chain);
      this.tools.clearWallet(validChain);
      return `Wallet disconnected for ${CHAINS[validChain].name}`;
    } else {
      this.tools.clearAllWallets();
      return "All wallets disconnected successfully";
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
    if (!wallet) return `No wallet set for ${CHAINS[validChain].name}. Please set a wallet first.`;
    return `${CHAINS[validChain].name} wallet address: ${wallet.address}`;
  }
}

class GetBalanceTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to check balance on"),
    address: z.string().optional().describe("Address to check (optional, uses connected wallet if not provided)"),
  });

  name = "getBalance";
  description = "Get native token and ERC-20 token balances for a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, address }: { chain: string; address?: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const provider = this.tools.getProvider(validChain);
    
    let targetAddress = address;
    if (!targetAddress) {
      const wallet = this.tools.getWallet(validChain);
      if (!wallet) return `No wallet set for ${chainConfig.name} and no address provided.`;
      targetAddress = wallet.address;
    }

    const balances: string[] = [];
    
    // Native token balance
    const nativeBalance = await provider.getBalance(targetAddress);
    balances.push(`${chainConfig.nativeCurrency.symbol} Balance: ${ethers.formatEther(nativeBalance)} ${chainConfig.nativeCurrency.symbol}`);

    // ERC-20 token balances
    const tokens = tokenMap[validChain] || {};
    for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(targetAddress);
        const decimals = await tokenContract.decimals();
        balances.push(`${tokenSymbol} Balance: ${ethers.formatUnits(balance, decimals)} ${tokenSymbol}`);
      } catch (error) {
        log.error(`Error fetching balance for ${tokenSymbol}:`, error);
        balances.push(`${tokenSymbol} Balance: Unable to fetch`);
      }
    }

    return `${chainConfig.name} balances for ${targetAddress}:\n${balances.join("\n")}`;
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
    
    if (!wallet) return `No wallet set for ${chainConfig.name}.`;
    
    try {
      const tx = { to, value: ethers.parseEther(amount) };
      const txResponse = await wallet.sendTransaction(tx);
      await txResponse.wait();
      log.info(`Transfer: ${amount} ${chainConfig.nativeCurrency.symbol} to ${to} on ${chainConfig.name}, Tx: ${txResponse.hash}`);
      return `Transferred ${amount} ${chainConfig.nativeCurrency.symbol} to ${to} on ${chainConfig.name}. Tx: ${chainConfig.explorerUrl}/tx/${txResponse.hash}`;
    } catch (error) {
      log.error("TransferTokensTool error:", error);
      throw new Error(`Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class SignMessageTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to sign message on"),
    message: z.string().describe("The message to sign"),
  });

  name = "signMessage";
  description = "Sign a message with the wallet on a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, message }: { chain: string; message: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const wallet = this.tools.getWallet(validChain);
    
    if (!wallet) return `No wallet set for ${chainConfig.name}.`;
    
    try {
      const signature = await wallet.signMessage(message);
      return `Message signed on ${chainConfig.name}: ${signature}`;
    } catch (error) {
      log.error("SignMessageTool error:", error);
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

class GetTransactionHistoryTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to get transaction history from"),
    count: z.number().optional().default(5).describe("Number of transactions to fetch"),
  });

  name = "getTransactionHistory";
  description = "Get recent transaction history with explorer links for a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, count }: { chain: string; count: number }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const wallet = this.tools.getWallet(validChain);
    
    if (!wallet) return `No wallet set for ${chainConfig.name}.`;
    
    const provider = this.tools.getProvider(validChain);
    const blockNumber = await provider.getBlockNumber();
    const fromBlock = Math.max(blockNumber - 99, 0);
    
    try {
      const filter = { fromBlock, toBlock: blockNumber, address: wallet.address };
      const logs = await provider.getLogs(filter);
      const recentTxs = logs.slice(0, count).map((log) => ({
        hash: `${chainConfig.explorerUrl}/tx/${log.transactionHash}`,
        blockNumber: log.blockNumber,
        data: log.data,
      }));
      return `Recent ${count} transactions on ${chainConfig.name}:\n${JSON.stringify(recentTxs, null, 2)}`;
    } catch (error) {
      log.error("GetTransactionHistoryTool error:", error);
      return `Failed to fetch transaction history: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class GetGasPriceTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to get gas price for"),
  });

  name = "getGasPrice";
  description = "Estimate current gas price for a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain }: { chain: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const provider = this.tools.getProvider(validChain);
    
    try {
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) return `Unable to fetch gas price for ${chainConfig.name}.`;
      return `Current gas price on ${chainConfig.name}: ${ethers.formatUnits(gasPrice, "gwei")} gwei`;
    } catch (error) {
      log.error("GetGasPriceTool error:", error);
      return `Failed to fetch gas price: ${error instanceof Error ? error.message : String(error)}`;
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
      const response = await axios.get<{ [key: string]: { usd: number } }>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        { 
          headers: COINGECKO_API_KEY ? { "x-cg-api-key": COINGECKO_API_KEY } : {},
          timeout: 10000 
        }
      );
      
      const price = response.data[coinId]?.usd;
      if (!price) return `Price not found for ${token}`;
      return `Price of ${token.toUpperCase()}: $${price} USD`;
    } catch (error) {
      log.error("GetTokenPriceTool error:", error);
      return `Failed to fetch price for ${token}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class GetTrendingTokensTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to get trending tokens from"),
  });

  name = "getTrendingTokens";
  description = "Get trending tokens from blockchain explorer";

  async _call({ chain }: { chain: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    
    try {
      const response = await axios.get<string>(`${chainConfig.explorerUrl}/tokens`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000,
      });
      
      const $ = cheerio.load(response.data);
      const tokens: { token: string; price: string }[] = [];
      
      $("table tbody tr").each((_, element) => {
        const tokenName = $(element).find("td:nth-child(1)").text().trim();
        const price = $(element).find("td:nth-child(2)").text().trim();
        if (tokenName && price) tokens.push({ token: tokenName, price });
      });
      
      if (tokens.length === 0) return `No token data found on ${chainConfig.name} explorer.`;
      return `Trending tokens from ${chainConfig.name}:\n${JSON.stringify(tokens.slice(0, 5), null, 2)}`;
    } catch (error) {
      log.error("GetTrendingTokensTool error:", error);
      return `Failed to fetch trending tokens from ${chainConfig.name}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class CreateTokenTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to create token on"),
    name: z.string().describe("The name of the token"),
    symbol: z.string().describe("The symbol of the token"),
    totalSupply: z.string().describe("The total supply of the token (in whole units)"),
  });

  name = "createToken";
  description = "Create a new ERC-20 token on a specific blockchain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, name, symbol, totalSupply }: { chain: string; name: string; symbol: string; totalSupply: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const wallet = this.tools.getWallet(validChain);
    
    if (!wallet) return `No wallet set for ${chainConfig.name}. Please set a wallet first.`;

    try {
      const factory = new ethers.ContractFactory(ERC20_ABI, TOKEN_BYTECODE, wallet);
      const totalSupplyWei = ethers.parseUnits(totalSupply, 18);
      const contract = await factory.deploy(name, symbol, totalSupplyWei);
      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();
      
      // Store token address
      if (!tokenMap[validChain]) tokenMap[validChain] = {};
      tokenMap[validChain][symbol] = contractAddress;
      
      log.info(`Token ${name} (${symbol}) created on ${chainConfig.name} at: ${contractAddress}`);
      return `Token ${name} (${symbol}) created successfully on ${chainConfig.name} at ${chainConfig.explorerUrl}/address/${contractAddress}`;
    } catch (error) {
      log.error("CreateTokenTool error:", error);
      throw new Error(`Failed to create token: ${error instanceof Error ? error.message : String(error)}`);
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
        return "Invalid Ethereum address provided.";
      }
      
      if (!chainConfig.faucetUrl) {
        return `No faucet available for ${chainConfig.name}.`;
      }
      
      return `To get testnet ${chainConfig.nativeCurrency.symbol} tokens for ${address} on ${chainConfig.name}, visit ${chainConfig.faucetUrl}, connect your wallet, paste your address (${address}), and request tokens. Note: Faucets may have rate limits and eligibility requirements.`;
    } catch (error) {
      log.error("GetFaucetTokensTool error:", error);
      return `Failed to process faucet request: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

class BatchMixedTransferTool extends StructuredTool {
  schema = z.object({
    chain: z.string().describe("The blockchain to perform transfers on"),
    transfers: z.string().describe("Space-separated list of transfers: '<type1> <to1> <amount1> [tokenName1] <type2> <to2> <amount2> [tokenName2]'"),
  });

  name = "batchMixedTransfer";
  description = "Transfer native and ERC-20 tokens in a batch on a specific chain";

  constructor(private tools: BlockchainTools) {
    super();
  }

  async _call({ chain, transfers }: { chain: string; transfers: string }) {
    const validChain = validateChain(chain);
    const chainConfig = CHAINS[validChain];
    const wallet = this.tools.getWallet(validChain);
    
    if (!wallet) return `No wallet set for ${chainConfig.name}. Please set a wallet first.`;

    const parts = transfers.trim().split(" ");
    if (parts.length < 3) {
      return "Invalid format. Use: batchMixedTransfer <chain> <type1> <to1> <amount1> [tokenName1] <type2> <to2> <amount2> [tokenName2] ...";
    }

    const transferList: { type: string; to: string; amount: string; tokenName?: string }[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      const type = parts[i].toUpperCase();
      const to = parts[i + 1];
      const amount = parts[i + 2];
      let tokenName: string | undefined;

      if (type === "TOKEN") {
        if (i + 3 >= parts.length) {
          return `Missing token name for TOKEN transfer at position ${i / 3 + 1}`;
        }
        tokenName = parts[i + 3];
        if (!tokenMap[validChain] || !tokenMap[validChain][tokenName]) {
          return `Token ${tokenName} not found on ${chainConfig.name}. Please create it first.`;
        }
        i++; // Skip the tokenName in the next iteration
      } else if (type !== chainConfig.nativeCurrency.symbol) {
        return `Invalid type: ${type}. Use '${chainConfig.nativeCurrency.symbol}' or 'TOKEN'`;
      }

      if (!ethers.isAddress(to)) return `Invalid address: ${to}`;
      if (isNaN(Number(amount)) || Number(amount) <= 0) return `Invalid amount: ${amount}`;
      transferList.push({ type, to, amount, tokenName });
    }

    const results: string[] = [];
    let nonce = await wallet.getNonce();

    for (const [index, { type, to, amount, tokenName }] of transferList.entries()) {
      try {
        if (type === chainConfig.nativeCurrency.symbol) {
          const tx = { to, value: ethers.parseEther(amount), nonce };
          const txResponse = await wallet.sendTransaction(tx);
          const receipt = await txResponse.wait();
          if (receipt && receipt.hash) {
            results.push(`${index + 1}. ${chainConfig.nativeCurrency.symbol} Transfer: ${amount} to ${to} - ${chainConfig.explorerUrl}/tx/${receipt.hash}`);
          }
        } else if (type === "TOKEN" && tokenName) {
          const tokenAddress = tokenMap[validChain][tokenName];
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
          const amountWei = ethers.parseUnits(amount, 18);
          const tx = await tokenContract.transfer(to, amountWei, { nonce });
          const receipt = await tx.wait();
          if (receipt && receipt.hash) {
            results.push(`${index + 1}. ${tokenName} Transfer: ${amount} to ${to} - ${chainConfig.explorerUrl}/tx/${receipt.hash}`);
          }
        }
        nonce++;
      } catch (error) {
        log.error(`Transfer to ${to} failed:`, error);
        results.push(`${index + 1}. Transfer to ${to} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return `Batch transfer completed on ${chainConfig.name}:\n${results.join("\n")}`;
  }
}

class HelpTool extends StructuredTool {
  schema = z.object({});

  name = "help";
  description = "List all available commands";

  async _call() {
    const commands = [
      "setWallet <privateKey> <chain> - Set your wallet for a specific chain",
      "disconnectWallet [chain] - Disconnect wallet (specific chain or all)",
      "getWalletAddress <chain> - Get your wallet address for a chain",
      "getBalance <chain> [address] - Check balances on a specific chain",
      "transferTokens <chain> <to> <amount> - Transfer native tokens",
      "signMessage <chain> <message> - Sign a message",
      "getTransactionHistory <chain> [count] - Get recent transactions",
      "getGasPrice <chain> - Get current gas price",
      "getTokenPrice <token> - Get token price (e.g., ETH, BNB)",
      "getTrendingTokens <chain> - Get trending tokens from explorer",
      "createToken <chain> <name> <symbol> <totalSupply> - Create a new token",
      "getFaucetTokens <chain> <address> - Request testnet tokens",
      "batchMixedTransfer <chain> <transfers> - Batch transfer native and tokens",
      "help - Show this list",
      "",
      "Supported chains: " + Object.keys(CHAINS).join(", "),
    ];
    return `Available commands:\n${commands.join("\n")}`;
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
  new SignMessageTool(blockchainTools),
  new GetTransactionHistoryTool(blockchainTools),
  new GetGasPriceTool(blockchainTools),
  new GetTokenPriceTool(),
  new GetTrendingTokensTool(),
  new CreateTokenTool(blockchainTools),
  new GetFaucetTokensTool(),
  new BatchMixedTransferTool(blockchainTools),
  new HelpTool(),
];

const toolNode = new ToolNode(tools);
const modelWithTools = llm.bindTools(tools);

// Define state
interface AgentState {
  messages: BaseMessage[];
}

// Agent logic
async function callAgent(state: AgentState): Promise<Partial<AgentState>> {
  const systemMessage = new SystemMessage(
    `You are Nexis, an AI assistant that helps users interact with multiple blockchain networks including Ethereum, Monad Testnet, Binance Smart Chain, and Base Sepolia. 

    You can help users with:
    - Setting up wallets for different chains
    - Checking balances across multiple networks
    - Transferring native tokens and ERC-20 tokens
    - Creating new tokens
    - Getting real-time price data
    - Viewing transaction history
    - And much more!

    Always specify which blockchain network you're working with. When users don't specify a chain, ask them to clarify which network they want to use.

    Available chains: ethereum, monad, bsc, baseSepolia

    Be helpful, secure, and always prioritize user safety. Never store private keys and remind users to keep their private keys secure.`
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

// CORS helper
function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://nexis.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Main Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { input, privateKey } = req.body as { input?: string; privateKey?: string };
    
    if (!input) {
      res.status(400).json({ error: 'Input is required' });
      return;
    }

    // Validate environment variables
    if (!OPENAI_API_KEY) {
      log.error('OPENAI_API_KEY not configured');
      res.status(500).json({ error: 'AI service not configured' });
      return;
    }

    const messages: BaseMessage[] = [];
    
    // If private key is provided, set wallet first
    if (privateKey) {
      // Extract chain from input or default to baseSepolia for Nexis
      const chainMatch = input.toLowerCase().match(/\b(ethereum|monad|bsc|basesepolia)\b/);
      const defaultChain = chainMatch ? chainMatch[1] : 'baseSepolia';
      messages.push(new HumanMessage(`setWallet ${privateKey} ${defaultChain}`));
    }
    
    messages.push(new HumanMessage(input));

    log.info(`Processing request: ${input}`);
    
    const result = await agent.invoke({ messages });
    const lastMessage = result.messages[result.messages.length - 1];
    
    log.info('Request processed successfully');
    
    res.status(200).json({ 
      response: lastMessage.content,
      timestamp: new Date().toISOString(),
      chain_support: Object.keys(CHAINS)
    });
    
  } catch (error) {
    log.error("Agent handler error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't expose sensitive error details in production
    const publicError = errorMessage.includes('API key') || errorMessage.includes('unauthorized') 
      ? 'Service temporarily unavailable' 
      : errorMessage;
    
    res.status(500).json({ 
      error: `Failed to process request: ${publicError}`,
      timestamp: new Date().toISOString()
    });
  }
}