/**
 * Main API entry point (Backward compatibility facade)
 * All domain-specific endpoints are located under lib/api/endpoints/
 */

export * from './api/endpoints/auth.api';
export * from './api/endpoints/workflow.api';
export * from './api/endpoints/command.api';
export * from './api/endpoints/autonomy.api';
export * from './api/endpoints/metrics.api';
export * from './api/endpoints/content.api';

// Export the central client for ad-hoc requests if needed
export { default as apiClient } from './api/client';
export * from './api/types';
export * from './api/types/auth.types';
export * from './api/types/workflow.api.types';
export * from './api/types/command.api.types';
export * from './api/types/metrics.api.types';
export * from './api/types/autonomy.api.types';
export * from './api/types/content.api.types';
