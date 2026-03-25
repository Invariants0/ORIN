'use client';

import React, { useRef, useEffect } from 'react';
import { useOrinStore } from '@/store/useOrinStore';
import { ChatMessage } from './ChatMessage';
import { Brain, Sparkles, Zap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatWindow = () => {
  const { messages, loadingStates, mode } = useOrinStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingStates.sendingMessage]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-8 space-y-10 scroll-smooth"
    >
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-8 opacity-50">
          <div className="w-24 h-24 bg-neutral-100 border-2 border-black flex items-center justify-center rounded-3xl">
            {mode === 'explore' ? <Brain className="w-12 h-12" /> : 
             mode === 'build' ? <Zap className="w-12 h-12" /> :
             <Layers className="w-12 h-12" />}
          </div>
          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-black uppercase tracking-tighter">
              {mode === 'explore' ? 'Explore your memory' : 
               mode === 'build' ? 'Build with Orin' :
               'Capture your thoughts'}
            </h2>
            <p className="font-bold text-lg">
              {mode === 'explore' 
                ? 'Ask questions about your Notion workspace, emails, or slack messages.' :
               mode === 'build'
                ? 'Create new Notion pages, databases, and systems using natural language.' :
                'Just dump your thoughts, links, or text. Orin will save them to Notion instantly.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {[
              "What did I receive today?",
              "Summarize my recent research",
              "Create a business plan from my notes",
              "Save this link to my inbox"
            ].map((suggestion) => (
              <button 
                key={suggestion}
                className="p-6 text-left border-2 border-black rounded-2xl hover:bg-[#ffe17c] hover:shadow-[4px_4px_0px_0px_#000000] transition-all font-bold uppercase text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-10">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {loadingStates.sendingMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-6"
            >
              <div className="w-10 h-10 bg-[#ffe17c] border-2 border-black flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="bg-neutral-100 border-2 border-black p-6 rounded-2xl rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-black rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
