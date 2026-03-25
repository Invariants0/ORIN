'use client';

import React, { useState, useRef } from 'react';
import { useOrinStore } from '@/store/useOrinStore';
import { Button } from '@/components/ui/Button';
import { Send, Paperclip, Globe, Zap, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ChatInput = () => {
  const [input, setInput] = useState('');
  const { mode, addMessage, setLoading, loadingStates } = useOrinStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || loadingStates.sendingMessage) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput('');
    setLoading('sendingMessage', true);

    // Mock AI Response
    setTimeout(() => {
      let content = "";
      let refs: string[] = [];

      if (mode === 'explore') {
        content = "Based on your Notion research, the future of AI is multimodal and agentic. I've found 3 related documents in your 'Inbox' database.";
        refs = ['Research_Notes.pdf', 'AI_Trends_2026'];
      } else if (mode === 'build') {
        content = "I've successfully created a new business plan document in your Notion 'Documents' database. You can view it using the reference below.";
        refs = ['Business_Plan_v1'];
      } else {
        content = "Memory Captured! I've dumped this into your Notion 'Inbox' database under the 'Brain Dump' category. It's now part of your living memory.";
        refs = ['Notion_Inbox'];
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content,
        timestamp: Date.now(),
        references: refs,
      };
      addMessage(aiMessage);
      setLoading('sendingMessage', false);
    }, 2000);
  };

  return (
    <div className="p-8 border-t-2 border-black bg-white sticky bottom-0 z-30">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="relative group">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              mode === 'explore' ? "Ask anything..." : 
              mode === 'build' ? "Tell Orin what to build..." : 
              "Dump your thoughts here..."
            }
            className={cn(
              "w-full bg-neutral-50 border-2 border-black rounded-2xl px-6 py-5 pr-32 text-lg font-bold focus:outline-none transition-all resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]",
              mode === 'build' ? "focus:ring-2 focus:ring-[#ffe17c]" : 
              mode === 'capture' ? "focus:ring-2 focus:ring-[#b7c6c2]" :
              "focus:ring-2 focus:ring-black"
            )}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-2 border-none shadow-none text-black/30 hover:text-black">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || loadingStates.sendingMessage}
              variant={mode === 'build' ? 'secondary' : 'primary'}
              className="w-12 h-12 p-0 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-black/40">
              <Globe className="w-3 h-3" />
              Web Search Off
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-black/40">
              <Zap className="w-3 h-3" />
              Gemini 1.5 Pro
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-black/20">
              Press Enter to send
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
