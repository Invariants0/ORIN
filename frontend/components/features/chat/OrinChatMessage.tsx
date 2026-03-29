'use client';

import React from 'react';
import { OrinMessage } from '@/stores/useOrinStore';
import { User, Bot, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandBadge } from '@/components/core/brand/Badge';
import { cn } from '@/lib/utils';

interface Props {
  message: OrinMessage;
}

export const OrinChatMessage = ({ message }: Props) => {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── Command user message (e.g. /store https://...) ──────────────
  if (isUser && message.command) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pl-1 border-l-2 border-black/20"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="bg-black text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
            {message.command}
          </span>
          {message.commandArgs && (
            <span className="font-mono text-xs text-blue-600 font-medium truncate">
              {message.commandArgs}
            </span>
          )}
          <span className="ml-auto text-[10px] text-black/30 font-mono flex-shrink-0">{time}</span>
        </div>
      </motion.div>
    );
  }

  // ── Command result (assistant with steps) ───────────────────────
  if (!isUser && message.commandSteps && message.commandSteps.length > 0) {
    const allDone = message.commandSteps.every((s) => s.status === 'done');
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pl-1 border-l-2 border-black/20 space-y-3"
      >
        {/* Description */}
        {message.content && (
          <p className="text-sm font-semibold text-black/70 leading-relaxed">
            {message.content}
          </p>
        )}

        {/* Steps block */}
        <div className="bg-neutral-50 border border-black/10 rounded-lg p-4 font-mono text-xs space-y-2">
          {message.commandSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {step.status === 'done' ? (
                <span className="text-black/60">✓</span>
              ) : step.status === 'running' ? (
                <span className="text-blue-500">
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                </span>
              ) : (
                <span className="text-black/20">·</span>
              )}
              <span
                className={cn(
                  step.status === 'done'
                    ? 'text-black/70 line-through decoration-black/20'
                    : step.status === 'running'
                    ? 'text-black font-bold'
                    : 'text-black/30'
                )}
              >
                {step.label}
              </span>
            </div>
          ))}

          {!allDone && message.isStreaming && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
          )}
        </div>

        {/* References */}
        {message.references && message.references.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.references.map((ref, i) => {
              const [label, url] = ref.includes('|') ? ref.split('|') : [ref, ref];
              const isUrl = url.startsWith('http');
              
              return (
                <BrandBadge
                  key={i}
                  variant="sage"
                  onClick={() => isUrl && window.open(url, '_blank')}
                  className={cn(
                    "flex items-center gap-1.5 py-1 px-3 transition-all text-[10px] rounded-full border-2 border-black font-bold",
                    isUrl ? "cursor-pointer hover:bg-[#ffe17c] hover:shadow-[2px_2px_0px_0px_#000]" : "opacity-50"
                  )}
                >
                  <ExternalLink className="w-3 h-3" />
                  {label}
                </BrandBadge>
              );
            })}
          </div>
        )}

        <div className="text-[10px] font-mono text-black/25">{time}</div>
      </motion.div>
    );
  }

  // ── Regular message ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-4', isUser ? 'flex-row-reverse' : '')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 border-2 border-black flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-black text-white' : 'bg-[#ffe17c] text-black'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[78%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-5 py-4 border-2 border-black rounded-2xl text-sm leading-relaxed font-medium',
            isUser
              ? 'bg-black text-white rounded-tr-none'
              : 'bg-white text-black rounded-tl-none shadow-[3px_3px_0px_0px_#000]'
          )}
        >
          {message.content}
        </div>

        {/* References */}
        {!isUser && message.references && message.references.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.references.map((ref, i) => {
              const [label, url] = ref.includes('|') ? ref.split('|') : [ref, ref];
              const isUrl = url.startsWith('http');
              
              return (
                <BrandBadge
                  key={i}
                  variant="sage"
                  onClick={() => isUrl && window.open(url, '_blank')}
                  className={cn(
                    "flex items-center gap-1.5 py-1 px-3 transition-all text-[10px] rounded-full border-2 border-black font-bold",
                    isUrl ? "cursor-pointer hover:bg-[#ffe17c] hover:shadow-[2px_2px_0px_0px_#000]" : "opacity-50"
                  )}
                >
                  <ExternalLink className="w-3 h-3" />
                  {label}
                </BrandBadge>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            'text-[10px] font-mono text-black/30',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {time}
        </div>
      </div>
    </motion.div>
  );
};
