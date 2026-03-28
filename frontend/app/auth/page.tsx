'use client';

import React from 'react';
import { Card } from '@/components/core/brand/Card';
import { Button } from '@/components/core/brand/Button';
import { BrandInput } from '@/components/core/brand/Input';
import { Github } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { authClient } from '@/lib/auth';

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 48 48"
      className="flex-shrink-0"
    >
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.25 3.6l6.88-6.88C35.93 2.38 30.45 0 24 0 14.6 0 6.51 5.38 2.63 13.22l8.05 6.26C12.28 13.03 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.43-4.75H24v9h12.8c-.55 2.96-2.2 5.46-4.66 7.14l7.2 5.6C43.72 36.5 46.5 30.8 46.5 24z"/>
      <path fill="#FBBC05" d="M10.68 28.48c-.5-1.48-.78-3.06-.78-4.73s.28-3.25.78-4.73l-8.05-6.26C.92 16.06 0 19.92 0 23.75s.92 7.69 2.63 11l8.05-6.27z"/>
      <path fill="#34A853" d="M24 48c6.45 0 11.93-2.12 15.9-5.76l-7.2-5.6c-2 1.35-4.56 2.16-8.7 2.16-6.3 0-11.72-3.53-13.32-8.98l-8.05 6.27C6.51 42.62 14.6 48 24 48z"/>
    </svg>
  );
}

export default function AuthPage() {
  const { loginWithGoogle, loginWithGithub, googleOneTap, isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    if (!isAuthenticated && !loading) {
      googleOneTap();
    }
  }, [isAuthenticated, loading, googleOneTap]);

  return (
    <div className="min-h-screen bg-[#ffe17c] flex items-center justify-center p-8 relative overflow-hidden">
      {/* Dot Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <Card variant="white" shadowSize="lg" className="w-full max-w-md relative z-10 p-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black border-2 border-black mb-6">
            <div className="w-6 h-6 bg-[#ffe17c] rotate-45" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Welcome to ORIN</h1>
          <p className="font-bold text-black/50 mt-2">Sign in to access your memory.</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#747775] text-[#1F1F1F] rounded-md shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            onClick={loginWithGoogle}
            style={{ fontFamily: 'Roboto, Arial, sans-serif', fontSize: '14px', lineHeight: '20px', fontWeight: 600 }}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full flex items-center justify-center gap-3 py-4" onClick={loginWithGithub}>
            <Github className="w-5 h-5" />
            Continue with Github
          </Button>
        </div>

        <p className="text-center mt-12 text-sm font-bold text-black/50">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-black underline">
            Terms of Service
          </Link>
        </p>
      </Card>
    </div>
  );
}
