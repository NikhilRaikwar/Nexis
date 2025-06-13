import { BarChart3, ShieldCheck, Wallet, ArrowUpDown, Zap, Globe } from "lucide-react";

export const features = [
  {
    title: "Multi-Chain AI Operations",
    description: "Experience seamless blockchain interaction across 6+ networks with our intelligent AI agent powered by natural language processing.",
    icon: <Globe className="w-6 h-6" />,
    image: "/uploads/multichain.jpg"
  },
  {
    title: "Secure Wallet Management",
    description: "Connect EVM and Solana wallets simultaneously. Private keys encrypted in-transit, never stored, automatically cleared from memory.",
    icon: <ShieldCheck className="w-6 h-6" />,
    image: "/uploads/secure.jpg"
  },
  {
    title: "Smart Token Transfers",
    description: "Send tokens across multiple chains using simple conversational commands. Auto-detects chain, amount, and recipient addresses.",
    icon: <Zap className="w-6 h-6" />,
    image: "/uploads/smart.jpg"
  },
  {
    title: "Real-Time Portfolio Tracking",
    description: "Monitor balances across all connected chains with live updates, gas price tracking, and comprehensive transaction history.",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "/uploads/real.jpg"
  }
];