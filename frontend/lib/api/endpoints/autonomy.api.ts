import client from '../client';
import { 
  AutonomousAction, 
  ExecuteActionRequest, 
  ExecuteActionResponse,
  AutonomyPolicy,
  AutonomyConfig,
  LearningInsight,
  AutonomyLevel
} from '../types/autonomy.api.types';

export type { 
  AutonomyLevel, 
  AutonomousAction, 
  ExecuteActionRequest, 
  ExecuteActionResponse, 
  ActionStatus, 
  RiskLevel,
  AutonomyPolicy,
  AutonomyConfig,
  LearningInsight
} from '../types/autonomy.api.types';


export const AutonomyApi = {
  /**
   * Fetch all pending and historical autonomous actions.
   */
  getActions: (): Promise<AutonomousAction[]> =>
    client.get('/autonomy/actions').then(res => res.data.actions || res.data.data || res.data || []),

  /**
   * Approve or reject an autonomous action.
   */
  executeAction: (payload: ExecuteActionRequest): Promise<ExecuteActionResponse> => {
    if (payload.decision === 'reject') {
      return client.post(`/autonomy/undo/${payload.actionId}`).then(res => res.data.data || res.data);
    }
    return client.post(`/autonomy/approve/${payload.actionId}`).then(res => res.data.data || res.data);
  },

  /**
   * Configure user autonomy settings
   */
  configure: (userId: string, level: AutonomyLevel, config?: Partial<AutonomyConfig>): Promise<{ success: boolean; config: AutonomyConfig }> =>
    client.post('/autonomy/configure', { userId, level, config }).then(res => res.data),

  /**
   * Get autonomy policies
   */
  getPolicies: (): Promise<AutonomyPolicy[]> =>
    client.get('/autonomy/policies').then(res => res.data.policies || res.data),

  /**
   * Toggle a specific policy
   */
  togglePolicy: (id: string, enabled: boolean): Promise<{ success: boolean }> =>
    client.post(`/autonomy/policies/${id}/toggle`, { enabled }).then(res => res.data),

  /**
   * Get macro learning insights
   */
  getInsights: (): Promise<LearningInsight[]> =>
    client.get('/autonomy/insights').then(res => res.data.insights || res.data),

  /**
   * Complete emergency stop
   */
  emergencyStop: (userId: string): Promise<{ success: boolean }> =>
    client.post('/autonomy/emergency-stop', { userId }).then(res => res.data),
};

