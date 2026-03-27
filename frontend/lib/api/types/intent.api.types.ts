export interface IntentDetectRequest {
  text: string;
}

export interface IntentDetectResponse {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}

export interface BatchIntentDetectRequest {
  texts: string[];
}

export interface BatchIntentDetectResponse {
  results: IntentDetectResponse[];
}
