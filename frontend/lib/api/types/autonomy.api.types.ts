export type AutonomyLevel = 'manual' | 'assisted' | 'semi_auto' | 'auto';

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AutonomousAction {
  id: string;
  action: string;
  confidence: number;
  riskLevel: RiskLevel;
  reasoning: string;
  expectedOutcome: string;
  dataUsed: string[];
  status: ActionStatus;
  createdAt: string;
}

export interface ExecuteActionRequest {
  actionId: string;
  decision: 'approve' | 'reject';
  approvalData?: {
    approvedBy?: string;
    note?: string;
  };
}

export interface ExecuteActionResponse {
  success: boolean;
  actionId: string;
  status: ActionStatus;
  executedAt: string;
}

export interface AutonomyPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  riskThreshold: RiskLevel;
}

export interface AutonomyConfig {
  userId: string;
  level: AutonomyLevel;
  maxDailyActions: number;
  allowedCategories: string[];
}

export interface LearningInsight {
  topic: string;
  confidenceGain: number;
  observations: string[];
  timestamp: string;
}

