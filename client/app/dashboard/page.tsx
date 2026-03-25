'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { useOrinStore } from '@/store/useOrinStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, X } from 'lucide-react';

export default function DashboardPage() {
  const { mode, setMode } = useOrinStore();
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Intercept mode change to show confirmation if needed
  const handleModeChange = (newMode: 'explore' | 'build') => {
    if (newMode === 'build') {
      setShowConfirm(true);
    } else {
      setMode('explore');
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative">
        <Topbar />
        
        <ChatWindow />
        
        <ChatInput />

        {/* Confirmation Modal for Build Mode */}
        <AnimatePresence>
          {showConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirm(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative z-10 w-full max-w-md"
              >
                <Card variant="white" shadowSize="lg" className="p-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 bg-[#ffe17c] border-2 border-black flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <button onClick={() => setShowConfirm(false)} className="p-2 hover:bg-neutral-100 rounded-lg transition-all">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Enter Build Mode?</h2>
                    <p className="font-bold text-black/60 leading-relaxed">
                      Build mode allows Orin to actively create and modify content in your Notion workspace. This action will require explicit confirmation for every write operation.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => setShowConfirm(false)} className="py-4">
                      CANCEL
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setMode('build');
                        setShowConfirm(false);
                      }} 
                      className="py-4"
                    >
                      CONTINUE
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
