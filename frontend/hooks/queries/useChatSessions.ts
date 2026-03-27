import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChatApi } from "@/lib/api/endpoints/chat.api";
import { queryKeys } from "./query-keys";
import { useOrinStore, OrinMessage, OrinSession } from "@/stores/useOrinStore";

type ApiSession = {
  id: string;
  title: string | null;
  createdAt: string | Date;
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    intent?: string | null;
    metadata?: any;
    createdAt: string | Date;
  }>;
};

function normalizeSessions(input: any): OrinSession[] {
  const rawSessions: ApiSession[] = Array.isArray(input)
    ? input
    : Array.isArray(input?.sessions)
    ? input.sessions
    : [];

  return rawSessions.map((session) => ({
    id: session.id,
    title: session.title || "New Session",
    createdAt: new Date(session.createdAt).getTime(),
  }));
}

function normalizeMessages(messages: ApiSession["messages"]): OrinMessage[] {
  if (!messages) return [];
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.createdAt).getTime(),
    metadata: {
      intent: message.intent || undefined,
      ...(message.metadata || {}),
    },
  }));
}

export function useChatSessions() {
  const setSessions = useOrinStore((s) => s.setSessions);

  const query = useQuery({
    queryKey: queryKeys.chat.sessions(),
    queryFn: () => ChatApi.getSessions(),
    staleTime: 10 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      const sessions = normalizeSessions(query.data);
      setSessions(sessions);
    }
  }, [query.data, setSessions]);

  return query;
}

export function useChatSessionMessages(sessionId: string | null) {
  const setSessionMessages = useOrinStore((s) => s.setSessionMessages);

  const query = useQuery({
    queryKey: sessionId ? queryKeys.chat.session(sessionId) : queryKeys.chat.session("none"),
    queryFn: () => ChatApi.getSession(sessionId as string),
    enabled: !!sessionId && !sessionId.startsWith("session-"),
    staleTime: 10 * 1000,
  });

  useEffect(() => {
    if (query.data && sessionId) {
      const session = query.data as ApiSession;
      const messages = normalizeMessages(session?.messages);
      setSessionMessages(sessionId, messages);
    }
  }, [query.data, sessionId, setSessionMessages]);

  return query;
}
