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
  ChevronRight,
  Zap,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { UserAccountDialog } from './UserAccountDialog';
import { useAuth } from '@/hooks/useAuth';
import { useChatSessions } from '@/hooks/queries/useChatSessions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatApi } from '@/lib/api/endpoints/chat.api';
import { queryKeys } from '@/hooks/queries/query-keys';
import { toast } from 'sonner';

export const OrinSidebar = () => {
  useChatSessions();
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    newSession,
    removeSession,
    isAccountOpen,
    setIsAccountOpen 
  } = useOrinStore();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => ChatApi.deleteSession(sessionId),
    onSuccess: (_data, sessionId) => {
      removeSession(sessionId);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions() });
      if (sessionId === currentSessionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.session(sessionId) });
      }
      toast.success('Session deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete session: ${error?.message ?? 'Unknown error'}`);
    }
  });

  const openSession = (id: string) => {
    setCurrentSessionId(id);
    if (pathname !== '/dashboard') router.push('/dashboard');
  };

  const handleNewSession = () => {
    newSession();
    if (pathname !== '/dashboard') router.push('/dashboard');
  };

  return (
    <aside className="w-64 h-screen bg-[#111613] border-r-2 border-black flex flex-col text-white flex-shrink-0">
      <UserAccountDialog isOpen={isAccountOpen} onOpenChange={setIsAccountOpen} />

      {/* Header — exact same height as Topbar (h-14) */}
      <button
        type="button"
        onClick={() => router.push('/')}
        className="h-14 border-b-2 border-black flex items-center px-5 gap-2.5 flex-shrink-0 bg-[#171e19] hover:bg-[#141a17] transition-colors"
      >
        <div className="w-7 h-7 bg-[#ffe17c] flex items-center justify-center border-2 border-black flex-shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <div className="w-2.5 h-2.5 bg-black rotate-45" />
        </div>
        <span className="text-lg font-extrabold tracking-tighter uppercase">ORIN</span>
      </button>

      {/* New Session Button */}
      <div className="px-4 py-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#ffe17c] text-black border-2 border-black font-black text-xs uppercase tracking-widest hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
        <div className="px-2 py-2 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#b7c6c2]/40">
            Recent
          </span>
          <History className="w-3 h-3 text-[#b7c6c2]/40" />
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center opacity-30">
            <MessageSquare className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold font-mono uppercase tracking-widest">No sessions yet</p>
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
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!deleteMutation.isPending) {
                      deleteMutation.mutate(session.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-all text-red-500 hover:text-red-400"
                  aria-label="Delete session"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
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

      {/* User & Nav Bar */}
      <div className="px-3 py-3 border-t-2 border-black/50 space-y-2 bg-[#171e19]">
        <div className="space-y-0.5">
          <Link
            href="/workflows"
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest group',
              pathname === '/workflows' ? 'bg-[#ffe17c] text-black shadow-[4px_4px_0px_0px_#000]' : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            Workflows
          </Link>
          <Link
            href="/settings"
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest group',
              pathname === '/settings' ? 'bg-[#ffe17c] text-black shadow-[4px_4px_0px_0px_#000]' : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Settings
          </Link>
        </div>

        {/* User Card */}
        {user && (
          <button
            onClick={() => setIsAccountOpen(true)}
            className="w-full mt-2 flex items-center gap-3 p-3 bg-black border-2 border-white/10 rounded-2xl hover:bg-neutral-900 transition-all group"
          >
            <div className="w-10 h-10 border-2 border-white/20 rounded-xl overflow-hidden flex-shrink-0 group-hover:rotate-3 transition-transform">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#ffe17c] flex items-center justify-center">
                  <span className="text-black font-black text-xs">{user.name[0]}</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] font-black uppercase tracking-tighter truncate leading-tight">{user.name}</p>
              <p className="text-[9px] font-mono text-white/30 truncate uppercase tracking-widest">{user.email.split('@')[0]}@...</p>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};
