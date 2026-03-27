'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { OrinSidebar } from '@/components/layout/OrinSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OrinChatWindow } from '@/components/features/chat/ChatWindow';
import { OrinChatInput } from '@/components/features/chat/OrinChatInput';
import { useOrinStore } from '@/stores/useOrinStore';
import { useChatSessionMessages, useChatSessions } from '@/hooks/queries/useChatSessions';
export default function DashboardPage() {
  const { currentSessionId, newSession, sessions, setCurrentSessionId } = useOrinStore();
  const inputPrefillRef = useRef<((text: string) => void) | null>(null);

  useChatSessions();
  useChatSessionMessages(currentSessionId);

  // Auto-select most recent session or create a draft one
  useEffect(() => {
    if (!currentSessionId) {
      if (sessions.length > 0) {
        setCurrentSessionId(sessions[0].id);
      } else {
        newSession();
      }
    }
  }, [currentSessionId, newSession, sessions, setCurrentSessionId]);

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
