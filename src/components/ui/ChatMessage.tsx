import React from 'react';
import { motion } from 'framer-motion';
import { User, Command } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 p-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={`${isUser ? 'bg-primary' : 'bg-secondary'} text-white`}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Command className="w-4 h-4" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-4 py-2 rounded-lg text-sm
            ${isUser 
              ? 'bg-primary text-white' 
              : 'glass border border-white/10 text-white'
            }
          `}
        >
          {message.content}
        </div>
        <span className="text-xs text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};