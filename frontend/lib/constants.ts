export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  mode: "explore" | "build";
  createdAt: Date;
}

export interface ClassificationResult {
  title: string;
  type: "idea" | "task" | "note" | "research" | "code";
  tags: string[];
  summary: string;
  content: string;
}
