import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IntentApi } from '@/lib/api/endpoints/intent.api';
import type { IntentDetectRequest, BatchIntentDetectRequest } from '@/lib/api/types/intent.api.types';
import { queryKeys } from './query-keys';

/**
 * Perform real-time intent classification for a small text segment
 */
export function useDetectIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IntentDetectRequest) => IntentApi.detect(payload),
    // Use the results downstream natively, no cache invalidation needed usually
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intent.all });
    }
  });
}

/**
 * Send an array of text snippets to evaluate and classify intent in batch
 */
export function useBatchDetectIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BatchIntentDetectRequest) => IntentApi.batchDetect(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intent.all });
    }
  });
}
