"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBox } from "@/components/chat/InputBox";
import { ModeToggle } from "@/components/ModeToggle";
import { Message, Session } from "@/lib/constants";
import { storeContent, retrieveContext } from "@/lib/api";

export default function DashboardPage() {
  const [mode, setMode] = useState<"explore" | "build">("explore");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem("orin-sessions");
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
        }
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("orin-sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const handleNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `Session ${sessions.length + 1}`,
      messages: [],
      mode: "explore",
      createdAt: new Date(),
    };
    
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages || []);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Detect command
      const command = content.startsWith("/") ? content.split(" ")[0] : null;
      
      let responseContent = "";

      if (command === "/store") {
        const input = content.replace("/store", "").trim();
        const result = await storeContent(input);
        responseContent = `✅ Content stored successfully!\n\nTitle: ${result.data.classification.title}\nType: ${result.data.classification.type}\nTags: ${result.data.classification.tags.join(", ")}`;
      } else if (command === "/analyze" || command === "/retrieve") {
        const query = content.replace(/\/(analyze|retrieve)/, "").trim();
        const result = await retrieveContext(query);
        responseContent = `${result.data.summary}\n\n**Insights:**\n${result.data.insights.map((i: string) => `- ${i}`).join("\n")}`;
      } else if (command === "/build" || command === "/generate") {
        responseContent = "🚧 Document generation is coming soon!";
      } else if (command === "/continue") {
        responseContent = "🚧 Continue work feature is coming soon!";
      } else {
        // Default: treat as retrieval query in explore mode
        if (mode === "explore") {
          const result = await retrieveContext(content);
          responseContent = `${result.data.summary}\n\n**Insights:**\n${result.data.insights.map((i: string) => `- ${i}`).join("\n")}`;
        } else {
          responseContent = "In Build mode, use commands like `/store`, `/build`, or `/generate` to create content in Notion.";
        }
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Update session in sessions list
      const updatedSessions = sessions.map((session) =>
        session.id === currentSessionId
          ? { ...session, messages: finalMessages }
          : session
      );
      setSessions(updatedSessions);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error: ${(error as Error).message}`,
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-72 hidden md:block">
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">ORIN</h1>
            <Link href="/workflows">
              <Button variant="ghost" size="sm">
                Workflows
              </Button>
            </Link>
          </div>
          <ModeToggle mode={mode} onModeChange={setMode} />
        </div>

        {/* Chat Messages */}
        <ChatWindow messages={messages} />

        {/* Input Box */}
        <InputBox onSend={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
