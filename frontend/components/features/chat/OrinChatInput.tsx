'use client';

import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useOrinStore, CommandStep } from '@/stores/useOrinStore';
import { Send, FileText, Search, Pickaxe, Play, Command, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatApi } from '@/lib/api/endpoints/chat.api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';

// ── Static command metadata (UI only) ────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: '/store',   desc: 'Extract URL or save text to Notion',       icon: FileText, color: 'bg-[#b7c6c2]' },
  { cmd: '/analyze', desc: 'Run structural analysis on your memory',    icon: Search,   color: 'bg-[#ffe17c]' },
  { cmd: '/build',   desc: 'Construct a Notion hierarchy from ideas',   icon: Pickaxe,  color: 'bg-black'     },
  { cmd: '/execute', desc: 'Execute a defined workflow step',           icon: Play,     color: 'bg-[#ffe17c]' },
];

const SLASH_SET = new Set(SLASH_COMMANDS.map((c) => c.cmd));

// ── Props ─────────────────────────────────────────────────────────────

interface OrinChatInputProps {
  prefillRef?: React.MutableRefObject<((text: string) => void) | null>;
}

// ── Component ─────────────────────────────────────────────────────────

export const OrinChatInput = ({ prefillRef }: OrinChatInputProps) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode, addMessage, updateMessage, setLoading, loadingStates, currentSessionId, setSession, promoteSession } = useOrinStore();

  // ── Prefill handle (suggestion clicks) ────────────────────────────
  useImperativeHandle(prefillRef as any, () => (text: string) => {
    setInput(text);
    setShowSlash(false);
    textareaRef.current?.focus();
  }, []);

  // ── Auto-resize textarea ──────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // ── Send handler ──────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loadingStates.sendingMessage) return;

    const [firstWord, ...rest] = trimmed.split(' ');
    const isSlashCommand = firstWord.startsWith('/') && SLASH_SET.has(firstWord);

    // 1. Add user message immediately
    addMessage({
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      command: isSlashCommand ? firstWord : undefined,
      commandArgs: isSlashCommand && rest.length ? rest.join(' ') : undefined,
    });

    setInput('');
    setShowSlash(false);
    setLoading('sendingMessage', true);

    const assistantMsgId = `a-${Date.now()}`;
    
    // 2. Add optimistic assistant bubble
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      command: isSlashCommand ? firstWord : undefined,
      commandSteps: [{ label: 'Processing...', status: 'running' }],
      isStreaming: true,
    });

    try {
      // 3. Call ChatApi orchestrator
      // Only pass sessionId if it's not a temporary client-side ID
    const tempSessionId = currentSessionId;
    const validSessionId = tempSessionId?.startsWith('session-') ? undefined : tempSessionId;
      
      const response = await ChatApi.sendMessage({
        message: trimmed,
        sessionId: validSessionId
      });

      // Update Session ID if it's new
      if (response.isNewSession && tempSessionId) {
        promoteSession(tempSessionId, response.sessionId);
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions() });
      } else if (response.sessionId) {
        setSession(response.sessionId);
      }

      // Map backend actions to visual CommandSteps
      const formattedSteps: CommandStep[] = (response.actions || []).map(a => ({
        label: `${a.type}: ${JSON.stringify(a.details)}`,
        status: a.status === 'completed' ? 'done' : 'failed'
      }));

      // 4. Update Assistant Bubble with real Orchestrator result
      updateMessage(assistantMsgId, {
        content: response.output,
        references: response.references || [],
        commandSteps: formattedSteps.length > 0 ? formattedSteps : undefined,
        metadata: {
          intent: response.intent,
          confidence: response.metadata.confidence,
          processingTimeMs: response.metadata.processingTimeMs
        },
        isStreaming: false,
      });

    } catch (err: any) {
      updateMessage(assistantMsgId, {
        content: `⚠️ Orchestrator Error: ${err?.message ?? 'Failed to process message'}`,
        commandSteps: [{ label: 'Execution Failed', status: 'failed' }],
        isStreaming: false,
      });
    } finally {
      setLoading('sendingMessage', false);
    }
  };

  // ── Keyboard & change handlers ────────────────────────────────────
  const filteredCmds = SLASH_COMMANDS.filter(
    (c) => slashQuery === '/' || c.cmd.startsWith(slashQuery.toLowerCase())
  );

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

  const isSending = loadingStates.sendingMessage;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 z-30 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        {/* Slash command popup */}
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
          {/* Command chip */}
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
              placeholder={isSending ? 'Orchestrating request...' : placeholder}
              disabled={isSending}
              className="flex-1 bg-transparent text-sm font-medium text-black placeholder:text-black/30 focus:outline-none resize-none leading-relaxed disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className={cn(
                'w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border-2 border-black transition-all',
                input.trim() && !isSending
                  ? 'bg-[#ffe17c] text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  : 'bg-neutral-100 text-black/30 border-black/10 cursor-not-allowed'
              )}
            >
              {isSending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
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
              <Zap className="w-3 h-3" /> orin-orchestrator
            </span>
            {isSending && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#b7c6c2] font-bold">
                <span className="w-1.5 h-1.5 bg-[#b7c6c2] rounded-full animate-pulse" />
                Processing
              </span>
            )}
            <span className="ml-auto text-[9px] font-mono text-black/20">Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};
