'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/core/brand/Button';
import { useOrinStore } from '@/stores/useOrinStore';
import { Github } from 'lucide-react';

export const Navbar = () => {
  const { user } = useOrinStore();

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-[#ffe17c] border-b-2 border-black z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-black">
          <div className="w-4 h-4 bg-[#ffe17c] rotate-45" />
        </div>
        <span className="text-2xl font-extrabold tracking-tighter uppercase">ORIN</span>
      </div>

      <div className="hidden md:flex items-center gap-8 font-bold uppercase text-sm">
        <Link href="#features" className="hover:underline underline-offset-4">Features</Link>
        <Link href="#how-it-works" className="hover:underline underline-offset-4">How it works</Link>
        <Link href="#modes" className="hover:underline underline-offset-4">Modes</Link>
      </div>

      <div className="flex items-center gap-4">
        <a href="https://github.com/Invariants0/ORIN" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
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
    </nav>
  );
};
