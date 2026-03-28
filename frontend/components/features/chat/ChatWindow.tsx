'use client';

import React, { useRef, useEffect } from 'react';
import { useOrinStore } from '@/stores/useOrinStore';
import { OrinChatMessage } from './OrinChatMessage';
import { Brain, Sparkles, Zap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTIONS: Record<string, string[]> = {
  explore: [
    'What did I receive today?',
    'Summarize my page',
    "What's in my Notion inbox?",
    'Find research on AI agents',
  ],
  build: [
    'Create a business plan from my notes',
    'Build a project tracker database',
    'Generate a weekly report template',
    'Structure my content calendar',
  ],
  capture: [
    'Save this: https://example.com/article',
    'Note: Remember to review Q2 goals',
    'Dump: Ideas for the new product feature',
    'Log: Meeting notes from today',
  ],
};

interface OrinChatWindowProps {
  onSuggestionClick?: (text: string) => void;
}

export const OrinChatWindow = ({ onSuggestionClick }: OrinChatWindowProps) => {
  const { getMessages, loadingStates, mode, currentSessionId } = useOrinStore();
  const messages = getMessages();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingStates.sendingMessage, currentSessionId]);

  const suggestions = SUGGESTIONS[mode] ?? SUGGESTIONS.explore;

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-8 pt-8 pb-44 space-y-6">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-8 opacity-60">
          <div className="w-24 h-24 bg-neutral-100 border-2 border-black flex items-center justify-center rounded-3xl">
            {mode === 'explore' ? (
              <Brain className="w-12 h-12" />
            ) : mode === 'build' ? (
              <Zap className="w-12 h-12" />
            ) : (
              <Layers className="w-12 h-12" />
            )}
          </div>
          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-black uppercase tracking-tighter">
              {mode === 'explore'
                ? 'Explore your memory'
                : mode === 'build'
                ? 'Build with Orin'
                : 'Capture your thoughts'}
            </h2>
            <p className="font-bold text-lg text-black/60">
              {mode === 'explore'
                ? 'Ask questions about your Notion workspace, emails, or Slack messages.'
                : mode === 'build'
                ? 'Create new Notion pages, databases, and systems with natural language.'
                : 'Dump your thoughts, links, or text — Orin organises them instantly.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="p-6 text-left border-2 border-black rounded-2xl hover:bg-[#ffe17c] hover:shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000] transition-all font-bold uppercase text-sm"
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
              <OrinChatMessage key={message.id} message={message} />
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
