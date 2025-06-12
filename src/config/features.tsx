import { BarChart3, ShieldCheck, Wallet, ArrowUpDown } from "lucide-react";

export const features = [
  {
    title: "Secure Wallet Verification",
    description: "Enter your private key only when needed. Encrypted in-transit, never stored, automatically deleted.",
    icon: <ShieldCheck className="w-6 h-6" />,
    image: "/uploads/86329743-ee49-4f2e-96f7-50508436273d.png"
  },
  {
    title: "USDC Transfers",
    description: "Send USDC on Base Sepolia using simple conversational commands. Fast, secure, and low-cost.",
    icon: <Wallet className="w-6 h-6" />,
    image: "/uploads/7335619d-58a9-41ad-a233-f7826f56f3e9.png"
  },
  {
    title: "Real-Time Balance Checks",
    description: "Instantly check your USDC balance on Base Sepolia with real-time updates and transaction confirmations.",
    icon: <BarChart3 className="w-6 h-6" />,
    image: "/uploads/b6436838-5c1a-419a-9cdc-1f9867df073d.png"
  },
  {
    title: "Transaction History",
    description: "View your recent USDC transactions with detailed Base Sepolia explorer links and timestamps.",
    icon: <ArrowUpDown className="w-6 h-6" />,
    image: "/uploads/79f2b901-8a4e-42a5-939f-fae0828e0aef.png"
  }
];