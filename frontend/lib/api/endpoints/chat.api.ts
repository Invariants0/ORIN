import client from '../client';

export interface ChatMessageRequest {
  message: string;
  sessionId?: string | null;
}

export interface ChatMessageResponse {
  intent: string;
  output: string;
  references?: string[];
  actions?: Array<{ type: string; status: string; details: any }>;
  metadata: {
    processingTimeMs: number;
    confidence: number;
    servicesUsed: string[];
  };
  sessionId: string;
  isNewSession: boolean;
}

export const ChatApi = {
  /**
   * Main chat endpoint - All user interactions flow through orchestrator
   */
  sendMessage: (payload: ChatMessageRequest): Promise<ChatMessageResponse> =>
    client.post('/message', payload).then(res => res.data.data || res.data),

  /**
   * Fetch older session details
   */
  getSession: (sessionId: string) =>
    client.get(`/sessions/${sessionId}`).then(res => res.data.data || res.data),

  /**
   * Fetch list of user sessions
   */
  getSessions: () =>
    client.get(`/sessions`).then(res => res.data.data || res.data)
};
