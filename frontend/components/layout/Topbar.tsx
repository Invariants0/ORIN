'use client';

import React from 'react';
import Link from 'next/link';
import { useOrinStore } from '@/stores/useOrinStore';
import { useAuth } from '@/hooks/useAuth';
import {
  Database,
  Mail,
  Slack,
  Zap,
  Search,
  Settings,
  Bell,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export const Topbar = () => {
  const { mode, setMode, connections, setIsAccountOpen, user: storeUser } = useOrinStore();
  const { user } = useAuth();
  const notionConnected = Boolean((storeUser as any)?.notionToken || (user as any)?.notionToken);

  return (
    <header className="h-14 bg-white border-b-2 border-black flex items-center justify-between px-5 sticky top-0 z-30 flex-shrink-0">

      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <div className="bg-neutral-100 border-2 border-black p-0.5 rounded-lg flex gap-0.5">
          {[
            { id: 'explore' as const, label: 'Explore', icon: Search,  active: 'bg-black text-white' },
            { id: 'capture' as const, label: 'Capture', icon: Layers,  active: 'bg-[#b7c6c2] text-black border border-black' },
            { id: 'build'   as const, label: 'Build',   icon: Zap,     active: 'bg-[#ffe17c] text-black border border-black' },
          ].map(({ id, label, icon: Icon, active }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
                mode === id ? active : 'text-black/40 hover:text-black hover:bg-black/5'
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {mode === 'build' && (
          <span className="text-[9px] font-black uppercase tracking-widest text-black bg-[#ffe17c] border border-black px-2 py-1 animate-pulse">
            ACTIVE OPERATOR
          </span>
        )}
      </div>

      {/* Right — connections + actions */}
      <div className="flex items-center gap-4">

        {/* Connection dots */}
        <div className="flex items-center gap-1.5">
          {[
            { key: 'notion' as const, icon: Database, label: 'Notion' },
            { key: 'email'  as const, icon: Mail,     label: 'Email' },
            { key: 'slack'  as const, icon: Slack,    label: 'Slack' },
          ].map(({ key, icon: Icon, label }) => {
            const isConnected = key === 'notion' ? notionConnected : connections[key];
            return (
            <div
              key={key}
              title={`${label}: ${isConnected ? 'connected' : 'disconnected'}`}
              className={cn(
                'w-6 h-6 rounded border-2 border-black flex items-center justify-center transition-all',
                isConnected ? 'bg-[#b7c6c2]' : 'bg-neutral-100 opacity-25'
              )}
            >
              <Icon className="w-3 h-3" />
            </div>
          )})}
        </div>

        <div className="h-5 w-px bg-black/10" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-black/40 hover:text-black hover:bg-neutral-100 transition-all">
            <Bell className="w-4 h-4" />
          </button>
          <Link href="/settings">
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-black/40 hover:text-black hover:bg-neutral-100 transition-all">
              <Settings className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Avatar Trigger */}
        <button 
          onClick={() => setIsAccountOpen(true)}
          className="w-10 h-10 rounded-xl border-2 border-black bg-[#ffe17c] overflow-hidden flex-shrink-0 hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all group"
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase bg-[#ffe17c]">
              {user?.name?.[0] || 'U'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
