import { useQuery } from '@tanstack/react-query';
import { CommandApi } from '@/lib/api/endpoints/command.api';
import type { ExecutionLogResponse } from '@/lib/api/types/command.api.types';
import { queryKeys } from './query-keys';

/**
 * Poll live execution logs for a running command.
 * 
 * Polling fires every 1.5s while `executionId` is defined.
 * The consumer should stop passing `executionId` when execution is complete.
 */
export function useCommandLogs(executionId: string | null) {
  return useQuery<ExecutionLogResponse>({
    queryKey: queryKeys.commands.logs(executionId ?? ''),
    queryFn: () => CommandApi.getCommandLogs(executionId!),
    enabled: !!executionId,
    refetchInterval: 1500,       // Poll every 1.5s while live
    staleTime: 0,                // Always re-fetch — this is a live stream
    retry: 1,                    // One retry on network blip, then fail gracefully
  });
}
