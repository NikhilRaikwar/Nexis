import { BarChart3, ShieldCheck, Wallet, ArrowUpDown, Zap, Globe } from "lucide-react";

export const features = [
  {
    title: "Multi-Chain AI Operations",
    description: "Experience seamless blockchain interaction across 6+ networks with our intelligent AI agent powered by natural language processing.",
    icon: <Globe className="w-6 h-6" />,
    image: "/uploads/86329743-ee49-4f2e-96f7-50508436273d.png"
  },
  {
    title: "Secure Wallet Management",
    description: "Connect EVM and Solana wallets simultaneously. Private keys encrypted in-transit, never stored, automatically cleared from memory.",
    icon: <ShieldCheck className="w-6 h-6" />,
    image: "/uploads/7335619d-58a9-41ad-a233-f7826f56f3e9.png"
  },
  {
    title: "Smart Token Transfers",
    description: "Send tokens across multiple chains using simple conversational commands. Auto-detects chain, amount, and recipient addresses.",
    icon: <Zap className="w-6 h-6" />,
    image: "/uploads/b6436838-5c1a-419a-9cdc-1f9867df073d.png"
  },
  {
    title: "Real-Time Portfolio Tracking",
    description: "Monitor balances across all connected chains with live updates, gas price tracking, and comprehensive transaction history.",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "/uploads/79f2b901-8a4e-42a5-939f-fae0828e0aef.png"
  }
];