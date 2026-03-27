'use client';

import React from 'react';
import { Card } from '@/components/core/brand/Card';
import { Button } from '@/components/core/brand/Button';
import { BrandInput } from '@/components/core/brand/Input';
import { Github, Chrome } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { authClient } from '@/lib/auth';

export default function AuthPage() {
  const { loginWithGoogle, loginWithGithub, googleOneTap, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated && !loading) {
      googleOneTap();
    }
  }, [isAuthenticated, loading, googleOneTap]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        alert(error.message || 'Login failed');
      } else {
        window.location.href = '/onboarding';
      }
    } catch (err) {
      alert('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Button variant="outline" className="w-full flex items-center justify-center gap-3 py-4" onClick={loginWithGoogle}>
            <Chrome className="w-5 h-5" />
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full flex items-center justify-center gap-3 py-4" onClick={loginWithGithub}>
            <Github className="w-5 h-5" />
            Continue with Github
          </Button>
        </div>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-black/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 font-black text-black/30">Or use email</span>
          </div>
        </div>

        <form
          className="space-y-6"
          onSubmit={handleEmailLogin}
        >
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest">Email Address</label>
            <BrandInput type="email" placeholder="name@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest">Password</label>
            <BrandInput type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg">
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center mt-8 text-sm font-bold text-black/50">
          Don&apos;t have an account?{' '}
          <Link href="#" className="text-black underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
