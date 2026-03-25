'use client';

import React from 'react';
import { useOrinStore } from '@/store/useOrinStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Plus, 
  MessageSquare, 
  History, 
  Settings, 
  LogOut, 
  ChevronRight,
  Brain,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const { sessions, currentSessionId, setCurrentSessionId } = useOrinStore();

  return (
    <aside className="w-80 h-screen bg-[#171e19] border-r-2 border-black flex flex-col text-white">
      {/* Sidebar Header */}
      <div className="p-6 border-b-2 border-black flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ffe17c] flex items-center justify-center border-2 border-black">
            <div className="w-3 h-3 bg-black rotate-45" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter uppercase">ORIN</span>
        </div>
        <Badge variant="yellow" className="text-[10px] border-none">PRO</Badge>
      </div>

      {/* New Session Button */}
      <div className="p-6">
        <Button 
          variant="secondary" 
          className="w-full flex items-center justify-center gap-2 py-4"
          onClick={() => setCurrentSessionId(null)}
        >
          <Plus className="w-5 h-5" />
          NEW SESSION
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        <div className="px-2 mb-4 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#b7c6c2]/50">Recent Sessions</span>
          <History className="w-3 h-3 text-[#b7c6c2]/50" />
        </div>

        {sessions.length === 0 ? (
          <div className="p-4 text-center space-y-2 opacity-30">
            <MessageSquare className="w-8 h-8 mx-auto" />
            <p className="text-xs font-bold">No sessions yet</p>
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl border-2 border-transparent transition-all group flex items-center justify-between",
                currentSessionId === session.id 
                  ? "bg-[#272727] border-white/10" 
                  : "hover:bg-[#272727]/50"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  currentSessionId === session.id ? "bg-[#ffe17c]" : "bg-white/20"
                )} />
                <span className="text-sm font-bold truncate">{session.title}</span>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-all",
                currentSessionId === session.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
              )} />
            </button>
          ))
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-6 border-t-2 border-black space-y-4">
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all text-sm font-bold">
          <Settings className="w-5 h-5" />
          SETTINGS
        </button>
        <button 
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-bold"
          onClick={() => window.location.href = '/'}
        >
          <LogOut className="w-5 h-5" />
          LOGOUT
        </button>
      </div>
    </aside>
  );
};
