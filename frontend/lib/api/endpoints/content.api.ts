import client from '../client';
import {
  StoreContentRequest,
  StoreContentResponse,
  RetrieveContextRequest,
  RetrieveContextResponse,
  AnalyzeContentRequest,
  AnalyzeContentResponse,
  GenerateDocumentRequest,
  GenerateDocumentResponse,
} from '../types/content.api.types';

export const ContentApi = {
  /**
   * Store raw content or URL for extraction and indexing.
   */
  store: (input: StoreContentRequest['input']): Promise<StoreContentResponse> =>
    client.post('/store', { input } satisfies StoreContentRequest).then(res => res.data.data || res.data),

  /**
   * Retrieve semantically relevant context for a specific query.
   */
  retrieve: (query: RetrieveContextRequest['query']): Promise<RetrieveContextResponse> =>
    client.post('/retrieve', { query } satisfies RetrieveContextRequest).then(res => res.data.data || res.data),

  /**
   * Run content analysis or mapping for a target environment.
   */
  analyze: (target: AnalyzeContentRequest['target']): Promise<AnalyzeContentResponse> =>
    client.post('/analyze', { target } satisfies AnalyzeContentRequest).then(res => res.data.data || res.data),

  /**
   * Generate a document based on a topic and context.
   */
  generateDocument: (payload: GenerateDocumentRequest): Promise<GenerateDocumentResponse> =>
    client.post('/generate-doc', payload).then(res => res.data.data || res.data),
};
