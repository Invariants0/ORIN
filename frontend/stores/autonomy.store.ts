import { create } from 'zustand';

export type AutonomyLevel = 'manual' | 'assisted' | 'semi_auto' | 'auto';

export interface AutonomousAction {
  id: string;
  action: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  expectedOutcome: string;
  dataUsed: string[];
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: string;
}

interface AutonomyState {
  level: AutonomyLevel;
  actions: AutonomousAction[];
  setLevel: (level: AutonomyLevel) => void;
  addAction: (action: AutonomousAction) => void;
  updateAction: (id: string, status: AutonomousAction['status']) => void;
  removeAction: (id: string) => void;
}

export const useAutonomyStore = create<AutonomyState>((set) => ({
  level: 'assisted',
  actions: [
    {
      id: 'act-1',
      action: 'Archive 12 inactive Notion pages',
      confidence: 94,
      riskLevel: 'low',
      reasoning: 'These pages haven\'t been modified in over 18 months and contain no outgoing links.',
      expectedOutcome: 'Reduced clutter in the "General" workspace and faster search indexing.',
      dataUsed: ['Notion_Page_Activity', 'Workspace_Analytics'],
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'act-2',
      action: 'Auto-categorize 45 inbox items',
      confidence: 88,
      riskLevel: 'medium',
      reasoning: 'Matches known patterns for "Research" and "Personal" categories.',
      expectedOutcome: 'Inbox zero achieved; all items sorted into respective databases.',
      dataUsed: ['User_Tagging_History', 'Content_Semantic_Analysis'],
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
  ],
  setLevel: (level) => set({ level }),
  addAction: (action) => set((state) => ({ actions: [action, ...state.actions] })),
  updateAction: (id, status) => set((state) => ({
    actions: state.actions.map(a => a.id === id ? { ...a, status } : a)
  })),
  removeAction: (id) => set((state) => ({
    actions: state.actions.filter(a => a.id !== id)
  })),
}));
