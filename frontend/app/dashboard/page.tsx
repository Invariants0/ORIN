'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { OrinSidebar } from '@/components/layout/OrinSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OrinChatWindow } from '@/components/features/chat/ChatWindow';
import { OrinChatInput } from '@/components/features/chat/OrinChatInput';
import { useOrinStore } from '@/stores/useOrinStore';

export default function DashboardPage() {
  const { currentSessionId, newSession } = useOrinStore();
  const inputPrefillRef = useRef<((text: string) => void) | null>(null);

  // Auto-create a new session if none is selected
  useEffect(() => {
    if (!currentSessionId) {
      newSession();
    }
  }, []);

  const handleSuggestionClick = useCallback((text: string) => {
    inputPrefillRef.current?.(text);
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <OrinSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />

        {/* Chat area — relative so floating input positions against it */}
        <div className="flex-1 relative overflow-hidden">
          <OrinChatWindow onSuggestionClick={handleSuggestionClick} />
          <OrinChatInput prefillRef={inputPrefillRef} />
        </div>
      </main>
    </div>
  );
}
