'use client';

import React from 'react';
import { useOrinStore } from '@/store/useOrinStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Database, 
  Mail, 
  Slack, 
  Zap, 
  Search,
  Settings,
  Bell,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Topbar = () => {
  const { mode, setMode, connections } = useOrinStore();

  return (
    <header className="h-20 bg-white border-b-2 border-black flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Mode Toggle */}
      <div className="flex items-center gap-4">
        <div className="bg-neutral-100 border-2 border-black p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setMode('explore')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'explore' ? "bg-black text-white" : "hover:bg-black/5"
            )}
          >
            <Search className="w-3 h-3" />
            Explore
          </button>
          <button
            onClick={() => setMode('capture')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'capture' ? "bg-[#b7c6c2] text-black border-2 border-black" : "hover:bg-black/5"
            )}
          >
            <Layers className="w-3 h-3" />
            Capture
          </button>
          <button
            onClick={() => setMode('build')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'build' ? "bg-[#ffe17c] text-black border-2 border-black" : "hover:bg-black/5"
            )}
          >
            <Zap className="w-3 h-3" />
            Build
          </button>
        </div>
        
        {mode === 'build' && (
          <Badge variant="yellow" className="animate-pulse">ACTIVE OPERATOR</Badge>
        )}
      </div>

      {/* Search Bar - Mock */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
          <input 
            type="text" 
            placeholder="Search your memory..." 
            className="w-full bg-neutral-50 border-2 border-black rounded-xl py-2 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ffe17c]"
          />
        </div>
      </div>

      {/* Connections & Actions */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center transition-all",
            connections.notion ? "bg-[#b7c6c2]" : "bg-neutral-100 opacity-30"
          )}>
            <Database className="w-4 h-4" />
          </div>
          <div className={cn(
            "w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center transition-all",
            connections.email ? "bg-[#b7c6c2]" : "bg-neutral-100 opacity-30"
          )}>
            <Mail className="w-4 h-4" />
          </div>
          <div className={cn(
            "w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center transition-all",
            connections.slack ? "bg-[#b7c6c2]" : "bg-neutral-100 opacity-30"
          )}>
            <Slack className="w-4 h-4" />
          </div>
        </div>

        <div className="h-8 w-[2px] bg-black/10" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="p-2 border-none shadow-none">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 border-none shadow-none">
            <Settings className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full border-2 border-black bg-[#ffe17c] overflow-hidden">
            <img src="https://picsum.photos/seed/user1/100/100" alt="Avatar" />
          </div>
        </div>
      </div>
    </header>
  );
};
