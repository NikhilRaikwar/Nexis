import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "What is Nexis and how does it work?",
    answer: "Nexis is an AI-powered Web3 assistant that simplifies blockchain interactions. It uses natural language processing to understand your requests and executes blockchain transactions on the Base network through conversational commands."
  },
  {
    question: "How do I connect my wallet to Nexis?",
    answer: "Simply click 'Get Started' and authenticate using Civic Auth. This secure process connects your wallet to the Base Testnet, allowing you to interact with blockchain features safely and efficiently."
  },
  {
    question: "What blockchain networks does Nexis support?",
    answer: "Currently, Nexis operates on the Base network (Base Sepolia testnet for testing). We chose Base for its fast transactions, low fees, and robust infrastructure that provides an optimal user experience."
  },
  {
    question: "Is my wallet and transaction data secure?",
    answer: "Yes, security is our top priority. We use Civic Auth for secure authentication, and all transactions are processed directly on the blockchain. Nexis never stores your private keys or sensitive wallet information."
  },
  {
    question: "What types of transactions can I perform with Nexis?",
    answer: "You can send USDC, tip other users, check your balance, view transaction history, and perform various token transfers. Simply describe what you want to do in natural language, and Nexis will handle the technical details."
  },
  {
    question: "Are there any fees for using Nexis?",
    answer: "Nexis itself is free to use. You'll only pay standard blockchain network fees (gas fees) for your transactions, which are typically very low on the Base network."
  },
  {
    question: "Can I use Nexis on mobile devices?",
    answer: "Yes! Nexis is fully responsive and works seamlessly on desktop, tablet, and mobile devices. The chat interface is optimized for touch interactions on mobile platforms."
  },
  {
    question: "How do I get help if I encounter issues?",
    answer: "If you experience any issues, you can reach out through our support channels. The AI assistant can also help troubleshoot common problems and guide you through various processes."
  }
];

export const FAQSection = () => {
  return (
    <section className="container px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Have Questions About{" "}
            <span className="text-gradient">Nexis?</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Find answers to common questions about our AI-powered Web3 assistant and how it can simplify your blockchain interactions.
          </p>
        </div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-8"
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqData.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-white/10 rounded-lg px-6 py-2 glass-hover"
              >
                <AccordionTrigger className="text-left text-white hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-300 pt-4 pb-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </motion.div>
    </section>
  );
};