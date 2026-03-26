import client from '../client';
import {
  IntentDetectRequest,
  IntentDetectResponse,
  BatchIntentDetectRequest,
  BatchIntentDetectResponse
} from '../types/intent.api.types';

export const IntentApi = {
  /**
   * Detect intent for a single text utterance
   */
  detect: (payload: IntentDetectRequest): Promise<IntentDetectResponse> =>
    client.post('/v1/intent/detect', payload).then(res => res.data.data || res.data),

  /**
   * Batch detect intents for multiple utterances
   */
  batchDetect: (payload: BatchIntentDetectRequest): Promise<BatchIntentDetectResponse> =>
    client.post('/v1/intent/batch-detect', payload).then(res => res.data.data || res.data),
};
