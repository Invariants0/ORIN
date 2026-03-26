'use client';

import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useOrinStore, CommandStep } from '@/stores/useOrinStore';
import { Send, FileText, Search, Pickaxe, Play, Command, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SLASH_COMMANDS = [
  { cmd: '/store',   desc: 'Extract URL or save text to Notion',       icon: FileText, color: 'bg-[#b7c6c2]' },
  { cmd: '/analyze', desc: 'Run structural analysis on your memory',    icon: Search,   color: 'bg-[#ffe17c]' },
  { cmd: '/build',   desc: 'Construct a Notion hierarchy from ideas',   icon: Pickaxe,  color: 'bg-black'     },
  { cmd: '/execute', desc: 'Execute a defined workflow step',           icon: Play,     color: 'bg-[#ffe17c]' },
];

const STEP_LABELS: Record<string, string[]> = {
  '/store':   ['Resolving intent and extracting content','Classifying content type and tags','Deduplication check against Notion','Writing to Notion Inbox database','Indexing for future retrieval'],
  '/analyze': ['Scanning Notion workspace structure','Running semantic similarity analysis','Detecting duplicate and orphaned pages','Generating structural insights report','Building knowledge graph connections'],
  '/build':   ['Parsing idea structure and intent','Mapping to Notion database schema','Creating parent page hierarchy','Generating sub-pages and properties','Linking cross-references in workspace'],
  '/execute': ['Initialising workflow step pipeline','Resolving context and parameters','Running execution engine','Validating step outputs','Persisting results to session store'],
};

const AI_CONTENT: Record<string, { content: string; refs: string[] }> = {
  '/store':   { content: "Content captured and stored in your Notion Inbox under 'AI Processed'. Duplicate check passed — this is a new entry.", refs: ['Notion_Inbox', 'AI_Processed'] },
  '/analyze': { content: "Analysis complete. Found 12 databases and 47 pages. Key issues: 3 duplicates, 8 orphaned pages.", refs: ['Memory_Graph', 'Duplicate_Report'] },
  '/build':   { content: "Hierarchy constructed. Created 4 parent pages, 2 databases, and 1 linked view.", refs: ['Notion_Hierarchy', 'Created_Pages'] },
  '/execute': { content: "Workflow execution complete. Step 3/3 — all outputs saved to session store.", refs: ['Workflow_Log'] },
};

const MODE_CONTENT: Record<string, { content: string; refs: string[] }> = {
  explore:  { content: "Based on your Notion workspace, I found 3 related documents on that topic.", refs: ['Research_Notes', 'AI_Trends_2026'] },
  build:    { content: "Done! I've created a new document in your Notion 'Documents' database.", refs: ['Created_Doc_v1'] },
  capture:  { content: "Memory captured! Saved to your Notion 'Inbox' under 'Brain Dump'.", refs: ['Notion_Inbox'] },
};

interface OrinChatInputProps {
  prefillRef?: React.MutableRefObject<((text: string) => void) | null>;
}

export const OrinChatInput = ({ prefillRef }: OrinChatInputProps) => {
  const [input, setInput] = useState('');
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode, addMessage, updateMessage, setLoading, loadingStates } = useOrinStore();

  // Expose prefill to parent (suggestion clicks)
  useImperativeHandle(prefillRef as any, () => (text: string) => {
    setInput(text);
    setShowSlash(false);
    textareaRef.current?.focus();
  }, []);

  const filteredCmds = SLASH_COMMANDS.filter(
    (c) => slashQuery === '/' || c.cmd.startsWith(slashQuery.toLowerCase())
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const first = val.split(' ')[0];
    if (val.startsWith('/') && !val.includes(' ')) {
      setShowSlash(true); setSlashQuery(first); setHighlighted(0);
    } else {
      setShowSlash(false);
    }
  };

  const selectCmd = (cmd: string) => {
    setInput(cmd + ' ');
    setShowSlash(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loadingStates.sendingMessage) return;

    const [firstWord, ...rest] = trimmed.split(' ');
    const isSlash = firstWord.startsWith('/') && STEP_LABELS[firstWord];

    // Add user message
    addMessage({
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      command: isSlash ? firstWord : undefined,
      commandArgs: isSlash && rest.length ? rest.join(' ') : undefined,
    });

    setInput('');
    setShowSlash(false);
    setLoading('sendingMessage', true);

    if (isSlash) {
      // Add assistant message with empty steps immediately
      const assistantId = `a-${Date.now()}`;
      const stepLabels = STEP_LABELS[firstWord];
      const initialSteps: CommandStep[] = stepLabels.map((label) => ({
        label,
        status: 'pending',
      }));

      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        commandSteps: initialSteps,
        isStreaming: true,
      });

      // Animate steps
      let stepIdx = 0;
      const advance = () => {
        if (stepIdx >= stepLabels.length) {
          // All done
          const out = AI_CONTENT[firstWord];
          updateMessage(assistantId, {
            content: out.content,
            references: out.refs,
            isStreaming: false,
            commandSteps: stepLabels.map((label) => ({ label, status: 'done' as const })),
          });
          setLoading('sendingMessage', false);
          return;
        }
        const idx = stepIdx++;
        const dur = 500 + Math.random() * 600;

        updateMessage(assistantId, {
          commandSteps: stepLabels.map((label, i) => ({
            label,
            status: i < idx ? 'done' : i === idx ? 'running' : 'pending',
          })),
        });

        setTimeout(advance, dur);
      };

      setTimeout(advance, 300);
    } else {
      // Regular AI response
      setTimeout(() => {
        const out = MODE_CONTENT[mode] ?? MODE_CONTENT.explore;
        addMessage({
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: out.content,
          timestamp: Date.now(),
          references: out.refs,
        });
        setLoading('sendingMessage', false);
      }, 1400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash && filteredCmds.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((i) => (i + 1) % filteredCmds.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted((i) => (i - 1 + filteredCmds.length) % filteredCmds.length); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && showSlash)) { e.preventDefault(); selectCmd(filteredCmds[highlighted].cmd); return; }
      if (e.key === 'Escape') { setShowSlash(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !showSlash) { e.preventDefault(); handleSend(); }
  };

  const placeholder =
    mode === 'build' ? 'Build something... or / for commands' :
    mode === 'capture' ? 'Dump your thoughts... or / for commands' :
    'Ask anything... or / for commands';

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 z-30 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        {/* Slash popup */}
        <AnimatePresence>
          {showSlash && filteredCmds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.12 }}
              className="mb-2 bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] overflow-hidden"
            >
              <div className="px-3 py-2 bg-black flex items-center gap-2">
                <Command className="w-3 h-3 text-[#ffe17c]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ffe17c]">Commands</span>
              </div>
              <div className="p-1.5 space-y-0.5">
                {filteredCmds.map((c, idx) => {
                  const Icon = c.icon;
                  const hi = idx === highlighted;
                  return (
                    <button
                      key={c.cmd}
                      onClick={() => selectCmd(c.cmd)}
                      onMouseEnter={() => setHighlighted(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                        hi ? 'bg-[#ffe17c]' : 'hover:bg-neutral-50'
                      )}
                    >
                      <div className={cn('w-7 h-7 border-2 border-black flex items-center justify-center rounded-md flex-shrink-0', hi ? 'bg-black' : c.color)}>
                        <Icon className={cn('w-3.5 h-3.5', hi || c.color === 'bg-black' ? 'text-white' : 'text-black')} />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold">{c.cmd}</div>
                        <div className="text-[10px] text-black/50 font-medium">{c.desc}</div>
                      </div>
                      {hi && <span className="ml-auto text-[9px] font-black text-black/30 border border-black/20 px-1.5 py-0.5 rounded">↵</span>}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-1.5 border-t border-black/10 bg-neutral-50">
                <span className="text-[9px] font-mono text-black/30">↑↓ navigate · Tab/Enter select · Esc dismiss</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating input bar */}
        <div className="bg-white border-2 border-black rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* command chip bar when command selected */}
          {input.startsWith('/') && input.includes(' ') && (
            <div className="px-4 pt-3 pb-0">
              <span className="inline-flex items-center gap-1 bg-black text-[#ffe17c] font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                <Command className="w-2.5 h-2.5" />
                {input.split(' ')[0]}
              </span>
            </div>
          )}

          <div className="flex items-end gap-2 px-4 py-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm font-medium text-black placeholder:text-black/30 focus:outline-none resize-none leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loadingStates.sendingMessage}
              className={cn(
                'w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border-2 border-black transition-all',
                input.trim() && !loadingStates.sendingMessage
                  ? mode === 'build' ? 'bg-[#ffe17c] hover:shadow-[2px_2px_0px_0px_#000]' : 'bg-black text-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-neutral-100 text-black/30 border-black/10 cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Status row */}
          <div className="px-4 py-2 border-t border-black/5 flex items-center gap-4 bg-neutral-50/80">
            <button
              onClick={() => { setInput('/'); setShowSlash(true); setSlashQuery('/'); textareaRef.current?.focus(); }}
              className="flex items-center gap-1 text-[10px] font-mono text-black/30 hover:text-black transition-colors"
            >
              <Command className="w-3 h-3" /> commands
            </button>
            <span className="flex items-center gap-1 text-[10px] font-mono text-black/20">
              <Zap className="w-3 h-3" /> gemini-1.5-pro
            </span>
            <span className="ml-auto text-[9px] font-mono text-black/20">Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};
