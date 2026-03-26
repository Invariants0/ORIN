import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CommandApi } from '@/lib/api/endpoints/command.api';
import type { CommandExecutionRequest } from '@/lib/api/types/command.api.types';
import { useCommandCenterStore } from '@/stores/useCommandCenterStore';
import { queryKeys } from '../queries/query-keys';
import { toast } from 'sonner';

/**
 * Phase 4 — Execute a command via the real ORIN Command API.
 *
 * Flow:
 * 1. POST /commands  →  backend starts execution, returns { executionId, status }
 * 2. An optimistic "loading" log entry appears immediately in the UI store
 * 3. WebSocket events (useCommandCenterWebSocket) drive real-time step updates
 * 4. On error, the log entry is marked failed with the error message
 */
export function useExecuteCommand() {
  const { addLog, updateLog, addCommandToHistory } = useCommandCenterStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CommandExecutionRequest) => CommandApi.execute(payload),

    onMutate: ({ command }) => {
      const tempId = `local-${Date.now()}`;

      // Add an optimistic log entry so the UI responds instantly
      addLog({
        id: tempId,
        command,
        timestamp: new Date(),
        status: 'loading',
        steps: [],
      });

      addCommandToHistory(command);
      return { tempId };
    },

    onSuccess: (data, _payload, context) => {
      // Replace the temp log ID with the real executionId from the server
      const { tempId } = context as { tempId: string };
      updateLog(tempId, {
        id: data.executionId,
        status: data.status === 'started' ? 'loading' : 'success',
      });
    },

    onError: (err: any, _payload, context) => {
      const { tempId } = context as { tempId: string };
      updateLog(tempId, {
        status: 'error',
        summary: `Error: ${err.message}`,
      });
      toast.error(`Command failed: ${err.message}`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commands.history() });
    },
  });
}
