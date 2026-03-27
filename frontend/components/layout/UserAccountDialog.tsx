'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/hooks/useAuth';
import { X, LogOut, Settings, Shield, User, Mail } from 'lucide-react';
import { Button } from '@/components/core/brand/Button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface UserAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

import { useRouter } from 'next/navigation';

export const UserAccountDialog = ({ isOpen, onOpenChange }: UserAccountDialogProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleManageSettings = () => {
    onOpenChange(false);
    router.push('/settings');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000] p-0 overflow-hidden z-[101] focus:outline-none"
              >
                {/* Header */}
                <div className="bg-[#ffe17c] border-b-4 border-black p-6 flex items-center justify-between">
                  {/* ... */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-black rotate-3">
                      <User className="text-[#ffe17c] w-6 h-6 -rotate-3" />
                    </div>
                    <Dialog.Title className="text-2xl font-black uppercase tracking-tighter">
                      Account
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="w-10 h-10 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none bg-white">
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Profile Section */}
                <div className="p-8 space-y-8">
                  {/* ... */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-black rounded-2xl rotate-3 group-hover:rotate-6 transition-transform" />
                      <div className="relative w-24 h-24 bg-white border-4 border-black rounded-2xl overflow-hidden -rotate-3 group-hover:rotate-0 transition-transform flex items-center justify-center">
                        {user.image ? (
                          <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-black/20" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase tracking-tight">{user.name}</h3>
                      <p className="text-black/60 font-mono text-sm flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {user.email}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 border border-green-800 text-green-800 rounded text-[10px] font-black uppercase tracking-widest mt-2">
                        <Shield className="w-2.5 h-2.5" />
                        Verified Account
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={handleManageSettings}
                      className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold uppercase text-sm hover:bg-neutral-50 transition-all shadow-[4px_4px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      <Settings className="w-4 h-4" />
                      Manage Settings
                    </button>
                    
                    <button 
                      onClick={() => logout()}
                      className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold uppercase text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all shadow-[4px_4px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-neutral-50 border-t-2 border-black p-4 text-center">
                  <p className="text-[10px] font-mono text-black/30 uppercase tracking-widest">
                    ORIN OS · v1.0.4-alpha · build_2026.03.27
                  </p>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
