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
