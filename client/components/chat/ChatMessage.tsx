'use client';

import React from 'react';
import { Message } from '@/types';
import { User, Bot, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-6",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 border-2 border-black flex items-center justify-center flex-shrink-0 transition-all",
        isUser ? "bg-black text-white" : "bg-[#ffe17c] text-black"
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Content */}
      <div className={cn(
        "max-w-[80%] space-y-4",
        isUser ? "text-right" : "text-left"
      )}>
        <div className={cn(
          "p-6 border-2 border-black rounded-2xl transition-all",
          isUser 
            ? "bg-black text-white rounded-tr-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" 
            : "bg-white text-black rounded-tl-none shadow-[4px_4px_0px_0px_#000000]"
        )}>
          <div className="prose prose-sm max-w-none prose-neutral font-bold leading-relaxed">
            {message.content}
          </div>
        </div>

        {/* References / Metadata */}
        {!isUser && message.references && message.references.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start">
            {message.references.map((ref, i) => (
              <Badge key={i} variant="sage" className="flex items-center gap-1.5 py-1 px-3 cursor-pointer hover:bg-black hover:text-white transition-all">
                <ExternalLink className="w-3 h-3" />
                {ref}
              </Badge>
            ))}
          </div>
        )}

        <div className="text-[10px] font-black uppercase tracking-widest text-black/30">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};
