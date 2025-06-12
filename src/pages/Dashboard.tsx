import React from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { ChatInterface } from '@/components/ui/ChatInterface';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      
      {/* Hero Section with Chat Interface */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative container px-4 pt-40 pb-20"
      >
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-[#0A0A0A]" />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-lg text-gray-400">
            How can I help you with blockchain interactions today?
          </p>
        </motion.div>

        {/* Chat Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative mx-auto max-w-4xl"
        >
          <div className="h-[600px]">
            <ChatInterface />
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
};

export default Dashboard;