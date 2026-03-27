export interface StoreContentRequest {
  input: string;
}

export interface StoreContentResponse {
  id: string;
  title: string;
  type: string;
  tags: string[];
  summary: string;
  storedAt: string;
}

export interface RetrieveContextRequest {
  query: string;
}

export interface ContextResult {
  id: string;
  title: string;
  content: string;
  relevanceScore: number;
  source: string;
  createdAt: string;
}

export interface RetrieveContextResponse {
  results: ContextResult[];
  query: string;
  totalFound: number;
}

export interface AnalyzeContentRequest {
  target: string;
}

export interface AnalyzeContentResponse {
  databases: number;
  pages: number;
  tags: string[];
  insights: string[];
}

export interface GenerateDocumentRequest {
  topic: string;
  context?: string;
}

export interface GenerateDocumentResponse {
  title: string;
  content: string;
  notionPageUrl?: string;
  generatedAt: string;
}
