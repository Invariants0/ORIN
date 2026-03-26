import client from '../client';
import { 
  CommandExecutionRequest, 
  CommandExecutionResponse, 
  ExecutionLogResponse 
} from '../types/command.api.types';

export const CommandApi = {
  /**
   * Execute a command via ORIN Command Engine.
   */
  execute: (payload: CommandExecutionRequest): Promise<CommandExecutionResponse> =>
    client.post('/commands', payload).then(res => res.data.data || res.data),

  /**
   * Retrieve execution logs for a specific command run.
   */
  getCommandLogs: (id: string): Promise<ExecutionLogResponse> =>
    client.get(`/commands/${id}`).then(res => res.data.data || res.data),

  /**
   * Return the SSE endpoint for live command streaming.
   */
  getStreamUrl: (id: string): string =>
    `${client.defaults.baseURL}/commands/${id}/stream`
};
