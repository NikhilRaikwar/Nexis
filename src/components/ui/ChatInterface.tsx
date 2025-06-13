import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage, Message } from './ChatMessage';
import { useToast } from '@/hooks/use-toast';
import { makeApiRequest, API_CONFIG } from '../../config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ChatInterface: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m Nexis, your AI-powered Web3 assistant. I can help you with blockchain transactions, check balances, and more on multiple networks including Base Sepolia, Ethereum, BSC, and Monad. What would you like to do?',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      setConnectionError('Please authenticate with Civic to use the AI assistant.');
    } else {
      setConnectionError(null);
    }
  }, [isAuthenticated]);

  const handleSendMessage = async (message: string) => {
    // Verify authentication before processing
    if (!isAuthenticated) {
      throw new Error('Authentication required. Please sign in with Civic to continue.');
    }

    try {
      console.log('Sending message to Render backend:', message);
      
      const response = await makeApiRequest(API_CONFIG.ENDPOINTS.AGENT, {
        input: message,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email
        } : null
      });
      
      if (!response.response) {
        throw new Error('Empty response from backend server');
      }

      // Add the assistant's response to messages
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: response.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConnectionError(null);
      
    } catch (error) {
      console.error('Error sending message to backend:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check authentication first
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in with Civic to use the AI assistant.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setConnectionError(null);

    try {
      await handleSendMessage(userMessage.content);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      let displayError = errorMessage;
      if (errorMessage.includes('timeout')) {
        displayError = 'The server is starting up. Please wait a moment and try again.';
      } else if (errorMessage.includes('Authentication required')) {
        displayError = 'Please sign in with Civic to continue using the AI assistant.';
      } else if (errorMessage.includes('Failed to connect')) {
        displayError = 'Unable to connect to the AI service. Please check your connection and try again.';
      }

      const errorResponseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I apologize, but I'm having trouble processing your request: ${displayError}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorResponseMessage]);
      setConnectionError(displayError);
      
      toast({
        title: 'Connection Error',
        description: displayError,
        variant: 'destructive',
      });
    } finally {
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
      {/* Connection Status */}
      {connectionError && (
        <Alert className="m-4 mb-0 border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            {connectionError}
          </AlertDescription>
        </Alert>
      )}

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
                <span className="text-gray-400">Nexis is thinking...</span>
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
            placeholder={
              isAuthenticated 
                ? "Ask about balances, send tokens, or any blockchain operation..."
                : "Please sign in with Civic to start chatting..."
            }
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
            disabled={isLoading || !isAuthenticated}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || !isAuthenticated}
            className="button-gradient px-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          {isAuthenticated ? (
            <>Powered by Nexis AI • Connected to {API_CONFIG.BASE_URL}</>
          ) : (
            <>Sign in with Civic to start using Nexis AI</>
          )}
        </div>
      </div>
    </motion.div>
  );
};