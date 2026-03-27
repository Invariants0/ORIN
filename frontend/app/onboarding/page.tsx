'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/core/brand/Card';
import { Button } from '@/components/core/brand/Button';
import { BrandInput } from '@/components/core/brand/Input';
import { BrandBadge } from '@/components/core/brand/Badge';
import { Check, ArrowRight, Key, Database, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/constants';
import { useSearchParams } from 'next/navigation';

export default function OnboardingPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const steps = [
    { id: 1, title: 'API Setup', icon: Key },
    { id: 2, title: 'Connect Notion', icon: Database },
    { id: 3, title: 'Finish', icon: Zap },
  ];

  useEffect(() => {
    if ((user as any)?.geminiKey) {
      setApiKey((user as any).geminiKey || '');
    }
  }, [user]);

  useEffect(() => {
    const notionConnected = Boolean((user as any)?.notionToken);
    const fromOAuth = searchParams.get('notion') === 'connected';
    if (fromOAuth || notionConnected) {
      setStep(3);
    }
  }, [searchParams, user]);

  const handleNext = useCallback(() => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      window.location.href = '/dashboard';
    }
  }, [step]);

  const handleSaveKey = useCallback(async () => {
    if (!apiKey) return;
    setIsSavingKey(true);
    try {
      const { error } = await authClient.updateUser({ geminiKey: apiKey } as any);
      if (error) throw error;
      handleNext();
    } catch (err) {
      alert('Failed to save Gemini API key. Please try again.');
    } finally {
      setIsSavingKey(false);
    }
  }, [apiKey, handleNext]);

  const connectNotion = useCallback(() => {
    setIsConnecting(true);
    window.location.href = `${API_BASE_URL}/notion/oauth/start?returnTo=/onboarding`;
  }, []);

  return (
    <div className="min-h-screen bg-[#ffe17c] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-2xl relative z-10">
        {/* Stepper */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-black/10 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-black transition-all ${
                  step >= s.id ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                {step > s.id ? <Check className="w-6 h-6" /> : s.id}
              </div>
              <span
                className={`text-xs font-black uppercase tracking-widest ${
                  step >= s.id ? 'text-black' : 'text-black/30'
                }`}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="white" shadowSize="lg" className="p-12">
              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <BrandBadge variant="yellow">STEP 01</BrandBadge>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">
                      Enter Gemini API Key
                    </h2>
                    <p className="font-bold text-black/50">
                      We need this to power your brain operating system.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest">
                        Gemini API Key
                      </label>
                      <BrandInput
                        type="password"
                        placeholder="AIzaSy..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    <p className="text-xs font-bold text-black/40">
                      Don&apos;t have a key?{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Get one here
                      </a>
                      .
                    </p>
                  </div>
                  <Button onClick={handleSaveKey} disabled={!apiKey || isSavingKey} className="w-full py-4 text-lg">
                    {isSavingKey ? 'Saving...' : 'Continue'} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <BrandBadge variant="sage">STEP 02</BrandBadge>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">
                      Connect Notion
                    </h2>
                    <p className="font-bold text-black/50">
                      Orin uses Notion as your long-term memory store.
                    </p>
                  </div>
                  <div className="p-8 border-2 border-dashed border-black/20 rounded-xl flex flex-col items-center justify-center gap-6 bg-neutral-50">
                    <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center">
                      <Database className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-black uppercase">Notion Workspace</h4>
                      <p className="text-sm font-bold text-black/40">
                        Authorize Orin to read/write to your workspace.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={connectNotion}
                      isLoading={isConnecting}
                      className="w-full py-4"
                    >
                      Authorize Notion
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={handleNext} className="w-full">
                    Skip for now
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-[#ffe17c] border-2 border-black rounded-full mb-4">
                    <Zap className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">
                      You&apos;re All Set!
                    </h2>
                    <p className="font-bold text-black/50 max-w-md mx-auto">
                      Your brain operating system is ready. Start a conversation to begin capturing
                      your thoughts.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <Card variant="sage" hasShadow={false} className="p-4 text-left border-black/10">
                      <h4 className="text-[10px] font-black uppercase mb-1">Explore</h4>
                      <p className="text-[8px] font-bold text-black/60">Read-only intelligence. Ask questions.</p>
                    </Card>
                    <Card variant="yellow" hasShadow={false} className="p-4 text-left border-black/10">
                      <h4 className="text-[10px] font-black uppercase mb-1">Build</h4>
                      <p className="text-[8px] font-bold text-black/60">Active operator. Create pages.</p>
                    </Card>
                    <Card variant="white" hasShadow={false} className="p-4 text-left border-black/10">
                      <h4 className="text-[10px] font-black uppercase mb-1">Capture</h4>
                      <p className="text-[8px] font-bold text-black/60">Brain dump. Save everything instantly.</p>
                    </Card>
                  </div>
                  <Button onClick={handleNext} className="w-full py-4 text-lg">
                    Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
