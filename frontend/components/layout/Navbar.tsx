'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/core/brand/Button';
import { useOrinStore } from '@/stores/useOrinStore';
import { Github } from 'lucide-react';

export const Navbar = () => {
  const { user } = useOrinStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black bg-[#ffea9a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#ffea9a]/85">
      <div className="h-20 px-6 md:px-10 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 bg-black flex items-center justify-center border border-black shadow-[2px_2px_0px_0px_#000] group-hover:shadow-[1px_1px_0px_0px_#000] transition-all">
            <div className="w-4 h-4 bg-[#ffe17c] rotate-45" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#b7c6c2] border border-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight uppercase leading-none">ORIN</span>
            <span className="text-[8px] font-black uppercase tracking-[0.18em] text-black/50">Notion MCP</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6 font-black uppercase text-[10px] tracking-[0.16em]">
          {[
            { href: '#features', label: 'Features' },
            { href: '#how-it-works', label: 'How It Works' },
            { href: '#tech-stack', label: 'Tech Stack' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-1.5 py-1 transition-all hover:tracking-[0.22em] group"
            >
              <span className="relative z-10">{item.label}</span>
              <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-black scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="https://github.com/Invariants0/ORIN" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 border-2 border-black/20 hover:border-black">
              <Github className="w-4 h-4" />
              GITHUB
            </Button>
          </a>
          {user ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <Link href="/auth">
              <Button size="sm">TRY DEMO</Button>
            </Link>
          )}
        </div>
      </div>
      <div className="h-1 bg-black/20" />
    </nav>
  );
};
