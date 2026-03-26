'use client';

import React from 'react';
import { useOrinStore } from '@/stores/useOrinStore';
import { Button } from '@/components/core/brand/Button';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  History,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const OrinSidebar = () => {
  const { sessions, currentSessionId, setCurrentSessionId, newSession } = useOrinStore();
  const router = useRouter();
  const pathname = usePathname();

  const openSession = (id: string) => {
    setCurrentSessionId(id);
    if (pathname !== '/dashboard') router.push('/dashboard');
  };

  const handleNewSession = () => {
    newSession();
    if (pathname !== '/dashboard') router.push('/dashboard');
  };

  return (
    <aside className="w-64 h-screen bg-[#171e19] border-r-2 border-black flex flex-col text-white flex-shrink-0">

      {/* Header — exact same height as Topbar (h-14) */}
      <div className="h-14 border-b-2 border-black flex items-center px-5 gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 bg-[#ffe17c] flex items-center justify-center border-2 border-black flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-black rotate-45" />
        </div>
        <span className="text-lg font-extrabold tracking-tighter uppercase">ORIN</span>
      </div>

      {/* New Session Button */}
      <div className="px-4 py-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#ffe17c] text-black border-2 border-black font-black text-xs uppercase tracking-widest hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        <div className="px-2 py-2 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#b7c6c2]/40">
            Recent
          </span>
          <History className="w-3 h-3 text-[#b7c6c2]/40" />
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center opacity-30">
            <MessageSquare className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">No sessions yet</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = currentSessionId === session.id;
            return (
              <button
                key={session.id}
                onClick={() => openSession(session.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg border-2 border-transparent transition-all group flex items-center gap-2.5',
                  isActive
                    ? 'bg-white/10 border-white/10'
                    : 'hover:bg-white/5'
                )}
              >
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    isActive ? 'bg-[#ffe17c]' : 'bg-white/20'
                  )}
                />
                <span className="text-xs font-bold truncate flex-1">{session.title}</span>
                <ChevronRight
                  className={cn(
                    'w-3 h-3 flex-shrink-0 transition-all',
                    isActive
                      ? 'opacity-60'
                      : 'opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'
                  )}
                />
              </button>
            );
          })
        )}
      </div>

      {/* Nav Links */}
      <div className="px-3 py-3 border-t-2 border-black/50 space-y-0.5">
        <Link
          href="/workflows"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-xs font-bold group',
            pathname === '/workflows' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          )}
        >
          <Zap className="w-4 h-4 flex-shrink-0" />
          Workflows
        </Link>
        <Link
          href="/settings"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-xs font-bold group',
            pathname === '/settings' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </Link>
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
          onClick={() => (window.location.href = '/')}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
};
