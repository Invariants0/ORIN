/**
 * Centralized Query Key Factory for TanStack Query.
 * Use these keys in all useQuery and useMutation hooks to ensure consistency
 * and make cache invalidation predictable.
 */

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },
  workflows: {
    all: ['workflows'] as const,
    lists: () => [...queryKeys.workflows.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.workflows.lists(), { filters }] as const,
    details: () => [...queryKeys.workflows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workflows.details(), id] as const,
    statistics: () => [...queryKeys.workflows.all, 'statistics'] as const,
    metrics: () => [...queryKeys.workflows.all, 'metrics'] as const,
  },
  autonomy: {
    all: ['autonomy'] as const,
    actions: () => [...queryKeys.autonomy.all, 'actions'] as const,
    config: (userId: string) => [...queryKeys.autonomy.all, 'config', userId] as const,
    policies: () => [...queryKeys.autonomy.all, 'policies'] as const,
    insights: () => [...queryKeys.autonomy.all, 'insights'] as const,
  },
  evolution: {
    all: ['evolution'] as const,
    status: () => [...queryKeys.evolution.all, 'status'] as const,
    performance: (agentType: string) => [...queryKeys.evolution.all, 'performance', agentType] as const,
    insights: () => [...queryKeys.evolution.all, 'insights'] as const,
  },
  multiAgent: {
    all: ['multi-agent'] as const,
    stats: () => [...queryKeys.multiAgent.all, 'stats'] as const,
    statuses: () => [...queryKeys.multiAgent.all, 'statuses'] as const,
    messages: () => [...queryKeys.multiAgent.all, 'messages'] as const,
  },
  intent: {
    all: ['intent'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
  },
  chat: {
    all: ['chat'] as const,
    sessions: () => [...queryKeys.chat.all, 'sessions'] as const,
    session: (id: string) => [...queryKeys.chat.all, 'session', id] as const,
  },
} as const;
