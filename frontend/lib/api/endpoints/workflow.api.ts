import client from '../client';
import { Workflow } from '@/lib/types/workflow.types';
import { WorkflowStatusUpdateResponse } from '../types/workflow.api.types';

export const WorkflowApi = {
  getWorkflows: (): Promise<Workflow[]> =>
    client.get('/workflows').then(res => res.data.data || res.data || []),

  getWorkflowById: (id: string): Promise<Workflow> =>
    client.get(`/workflows/${id}`).then(res => res.data.data || res.data),

  pause: (id: string): Promise<WorkflowStatusUpdateResponse> =>
    client.post(`/workflows/${id}/pause`).then(res => res.data.data || res.data),

  resume: (id: string): Promise<WorkflowStatusUpdateResponse> =>
    client.post(`/workflows/${id}/resume`).then(res => res.data.data || res.data),

  cancel: (id: string): Promise<WorkflowStatusUpdateResponse> =>
    client.post(`/workflows/${id}/cancel`).then(res => res.data.data || res.data),
};
