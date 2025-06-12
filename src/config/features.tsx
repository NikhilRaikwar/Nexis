import { BarChart3, ShieldCheck, Wallet, ArrowUpDown } from "lucide-react";

export const features = [
  {
    title: "Secure Wallet Connection",
    description: "Log in with Civic Auth and securely connect your Base Testnet wallet in seconds.",
    icon: <ShieldCheck className="w-6 h-6" />,
    image: "/uploads/86329743-ee49-4f2e-96f7-50508436273d.png"
  },
  {
    title: "Conversational Transactions",
    description: "Send USDC, tip users, or transfer tokens using simple, natural commands.",
    icon: <Wallet className="w-6 h-6" />,
    image: "/uploads/7335619d-58a9-41ad-a233-f7826f56f3e9.png"
  },
  {
    title: "Real-Time Balance Tracking",
    description: "Instantly check your USDC balance with real-time updates on Base.",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "/uploads/b6436838-5c1a-419a-9cdc-1f9867df073d.png"
  },
  {
    title: "Transparent History",
    description: "Review your recent transactions with detailed Base Sepolia explorer links.",
    icon: <ArrowUpDown className="w-6 h-6" />,
    image: "/uploads/79f2b901-8a4e-42a5-939f-fae0828e0aef.png"
  }
];