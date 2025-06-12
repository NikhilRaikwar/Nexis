import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, Message } from './ChatMessage';
import { useToast } from '@/hooks/use-toast';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your Web3 AI assistant. I can help you with blockchain transactions, check balances, and more. What would you like to do?',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response for demo purposes
      setTimeout(() => {
        const responses = [
          "I understand you want to perform a blockchain operation. For security reasons, I'll need to verify your wallet connection first.",
          "That's a great question about Web3! Let me help you with that transaction.",
          "I can help you check your balance. Please make sure your wallet is connected to the Base network.",
          "For tipping operations, I'll need the recipient's address and the amount you'd like to send.",
          "I'm here to assist with your blockchain needs. What specific operation would you like to perform?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: randomResponse,
          role: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col glass rounded-xl overflow-hidden border border-white/10"
    >
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-0">
        <div className="space-y-2">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex gap-3 p-4">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              </div>
              <div className="glass border border-white/10 px-4 py-2 rounded-lg">
                <span className="text-gray-400">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about Web3 transactions, balances, or blockchain queries..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="button-gradient px-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};