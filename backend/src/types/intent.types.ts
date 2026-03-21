export enum IntentType {
  STORE = 'STORE',
  QUERY = 'QUERY',
  GENERATE_DOC = 'GENERATE_DOC',
  OPERATE = 'OPERATE',
  UNCLEAR = 'UNCLEAR'
}

export interface StoreIntent {
  type: IntentType.STORE;
  content: string;
  suggestedTitle?: string;
  tags?: string[];
  category?: string;
}

export interface QueryIntent {
  type: IntentType.QUERY;
  question: string;
  searchTerms: string[];
  contextNeeded: boolean;
}

export interface GenerateDocIntent {
  type: IntentType.GENERATE_DOC;
  documentType: string;
  topic: string;
  requirements?: string[];
  targetAudience?: string;
}

export interface OperateIntent {
  type: IntentType.OPERATE;
  action: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
}

export interface UnclearIntent {
  type: IntentType.UNCLEAR;
  reason: string;
  clarificationNeeded: string[];
}

export type Intent = StoreIntent | QueryIntent | GenerateDocIntent | OperateIntent | UnclearIntent;

export interface IntentDetectionResult {
  intent: Intent;
  confidence: number;
  rawInput: string;
  processingTimeMs: number;
}
