export interface AgentStatus {
  id: string;
  type: string;
  status: 'idle' | 'busy' | 'offline' | 'error';
  lastActive: string;
  tasksCompleted: number;
}

export interface MultiAgentSystemStats {
  activeAgents: number;
  totalTasksProcessed: number;
  averageResponseTimeMs: number;
  systemHealth: string;
}

export interface InterAgentMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  payload: any;
  timestamp: string;
}

export interface AgentQueryRequest {
  query: string;
  userId: string;
  sessionId?: string;
}

export interface AgentQueryResponse {
  response: string;
  delegationPath: string[];
  executionTimeMs: number;
}
