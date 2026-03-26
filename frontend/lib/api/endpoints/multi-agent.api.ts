import client from '../client';
import {
  AgentStatus,
  MultiAgentSystemStats,
  InterAgentMessage,
  AgentQueryRequest,
  AgentQueryResponse
} from '../types/multi-agent.api.types';

export const MultiAgentApi = {
  /**
   * Initialize the multi-agent system
   */
  initialize: (): Promise<{ success: boolean }> =>
    client.post('/multi-agent/initialize').then(res => res.data),

  /**
   * Shutdown the multi-agent system
   */
  shutdown: (): Promise<{ success: boolean }> =>
    client.post('/multi-agent/shutdown').then(res => res.data),

  /**
   * Get system statistics
   */
  getStats: (): Promise<MultiAgentSystemStats> =>
    client.get('/multi-agent/stats').then(res => res.data.data || res.data),

  /**
   * Get all agent statuses
   */
  getStatuses: (): Promise<AgentStatus[]> =>
    client.get('/multi-agent/agents/status').then(res => res.data.data || res.data),

  /**
   * Get message history
   */
  getMessages: (limit: number = 100): Promise<InterAgentMessage[]> =>
    client.get('/multi-agent/messages', { params: { limit } }).then(res => res.data.data || res.data),

  /**
   * Handle user query through multi-agent delegation
   */
  query: (payload: AgentQueryRequest): Promise<AgentQueryResponse> =>
    client.post('/multi-agent/query', payload).then(res => res.data.data || res.data),
};
