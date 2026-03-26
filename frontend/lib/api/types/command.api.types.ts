export interface CommandExecutionRequest {
  command: string;
  args?: string;
  context?: Record<string, any>;
  sessionId?: string;
}

export interface CommandExecutionResponse {
  executionId: string;
  status: 'started' | 'failed' | 'queued';
  message?: string;
}

export interface ExecutionStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  timestamp: string;
}

export interface ExecutionLogResponse {
  executionId: string;
  command: string;
  steps: ExecutionStep[];
  logs: string[];
  summary?: string;
}
