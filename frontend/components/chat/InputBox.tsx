"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip } from "lucide-react";

interface InputBoxProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function InputBox({ onSend, isLoading }: InputBoxProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-background">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        disabled={isLoading}
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Use /store, /analyze, /build, /continue)"
        className="flex-1 resize-none min-h-[60px] max-h-[200px] px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        disabled={isLoading}
      />
      
      <Button 
        type="submit" 
        size="icon"
        disabled={isLoading || !input.trim()}
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
