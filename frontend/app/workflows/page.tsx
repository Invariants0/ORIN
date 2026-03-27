"use client";

import { useRouter } from 'next/navigation';
import { useWorkflows } from '@/hooks/queries/useWorkflowQueries';
import { useMetrics } from '@/hooks/queries/useMetricsQueries';

import { useMetricsStore } from '@/stores/metrics.store';
import { useAlertsStore } from '@/stores/alerts.store';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { WorkflowList } from '@/components/features/workflow/WorkflowList';
import { Workflow, SystemMetrics } from '@/lib/types/workflow.types';
import { AlertList } from '@/components/features/alerts/AlertList';
import { ErrorBoundary } from '@/components/core/ErrorBoundary';
import { OrinSidebar } from '@/components/layout/OrinSidebar';
import { Card } from '@/components/core/brand/Card';
import { BrandBadge } from '@/components/core/brand/Badge';
import { Button } from '@/components/core/brand/Button';
import {
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAutonomyStore } from '@/stores/autonomy.store';
import { useAutonomyActions, useExecuteAutonomyAction } from '@/hooks/queries/useAutonomyQueries';
import { AutonomyLevelSelector } from '@/components/features/autonomy/AutonomyLevelSelector';
import { ActionApprovalPanel } from '@/components/features/autonomy/ActionApprovalPanel';
import { DecisionLogViewer } from '@/components/features/autonomy/DecisionLogViewer';
import { ExecutionTimeChart } from '@/components/features/analytics/charts/ExecutionTimeChart';
import { WorkflowStatusChart } from '@/components/features/analytics/charts/WorkflowStatusChart';
import { MetricsPanel } from '@/components/features/analytics/metrics/MetricsPanel';
import { ConnectionIndicator } from '@/components/features/system/ConnectionIndicator';

function isSystemMetrics(value: unknown): value is SystemMetrics {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.activeWorkflows === 'number' &&
    typeof c.completedWorkflows === 'number' &&
    typeof c.failedWorkflows === 'number' &&
    typeof c.queueSize === 'number' &&
    typeof c.averageExecutionTime === 'number' &&
    typeof c.successRate === 'number' &&
    typeof c.failureRate === 'number'
  );
}

type Tab = 'overview' | 'workflows' | 'autonomy' | 'analytics' | 'alerts';

export default function WorkflowsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: workflows = [], isLoading, refetch } = useWorkflows();
  const { data: metricsData } = useMetrics();
  const { alerts, removeAlert, acknowledgeAlert, clearAlerts } = useAlertsStore();
  // Autonomy — real data from backend + optimistic mutations
  const { level, setLevel } = useAutonomyStore();
  const { data: actions = [], isLoading: actionsLoading } = useAutonomyActions();
  const { mutate: executeAction } = useExecuteAutonomyAction();
  useWebSocketContext();

  const displayWorkflows = workflows;
  const displayMetrics = isSystemMetrics(metricsData)
    ? metricsData
    : useMetricsStore.getState().metrics;

  const handleWorkflowClick = (workflow: Workflow) => {
    router.push(`/workflows/${workflow.id}`);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'workflows', label: 'Workflows' },
    { id: 'autonomy', label: `Autonomy${actions.filter(a => a.status === 'pending').length > 0 ? ` (${actions.filter(a => a.status === 'pending').length})` : ''}` },
    { id: 'analytics', label: 'Analytics' },
    { id: 'alerts', label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
  ];

  const statCards = displayMetrics
    ? [
      {
        label: 'Active',
        value: displayMetrics.activeWorkflows,
        icon: Activity,
        color: 'bg-[#ffe17c]',
      },
      {
        label: 'Completed',
        value: displayMetrics.completedWorkflows,
        icon: CheckCircle2,
        color: 'bg-[#b7c6c2]',
      },
      {
        label: 'Failed',
        value: displayMetrics.failedWorkflows,
        icon: XCircle,
        color: 'bg-white',
      },
      {
        label: 'Queue',
        value: displayMetrics.queueSize,
        icon: Clock,
        color: 'bg-white',
      },
      {
        label: 'Avg Time',
        value: `${Math.round(displayMetrics.averageExecutionTime / 1000)}s`,
        icon: Zap,
        color: 'bg-[#ffe17c]',
      },
      {
        label: 'Success Rate',
        value: `${Math.round(displayMetrics.successRate * 100)}%`,
        icon: CheckCircle2,
        color: 'bg-[#b7c6c2]',
      },
    ]
    : [];

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white overflow-hidden font-sans">
        <OrinSidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-white border-b-2 border-black flex items-center px-5 sticky top-0 z-30 gap-4 flex-shrink-0">
            <div className="w-10 h-10 bg-black border-2 border-black flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-[#ffe17c]" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Workflow Monitor</h1>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                Real-time execution tracking
              </p>
            </div>

            <div className="ml-auto flex items-center gap-6">
              <ConnectionIndicator />
              {alerts.length > 0 && (
                <div className="flex items-center gap-2 bg-[#ffe17c] border-2 border-black px-4 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-black uppercase text-black">{alerts.length} Alerts</span>
                </div>
              )}
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  ← Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => refetch()}
                isLoading={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </header>

          {/* Tab bar */}
          <div className="flex items-center gap-1 px-8 pt-6 flex-shrink-0">
            <div className="bg-neutral-100 border-2 border-black p-1 rounded-xl flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                    activeTab === tab.id
                      ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                      : 'hover:bg-black/5'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-8">

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <>
                {/* Stat cards */}
                {statCards.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {statCards.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <Card
                          key={stat.label}
                          variant="white"
                          className={cn('p-5 space-y-3', stat.color)}
                        >
                          <div className="w-9 h-9 bg-white border-2 border-black flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-3xl font-black">{stat.value}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-black/50">
                              {stat.label}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Recent workflows and Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pt-4">
                  <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BrandBadge variant="yellow">RECENT</BrandBadge>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Workflows</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('workflows')}
                        className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                      >
                        View All <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="border-2 border-black rounded-2xl overflow-hidden">
                      <WorkflowList
                        workflows={displayWorkflows.slice(0, 6)}
                        onWorkflowClick={handleWorkflowClick}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <WorkflowStatusChart workflows={displayWorkflows} />
                    {displayMetrics && (
                      <ExecutionTimeChart 
                        history={[displayMetrics]} 
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Workflows tab */}
            {activeTab === 'workflows' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BrandBadge variant="sage">ALL</BrandBadge>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">
                    Workflows ({displayWorkflows.length})
                  </h2>
                </div>
                <div className="border-2 border-black rounded-2xl overflow-hidden">
                  <WorkflowList
                    workflows={displayWorkflows}
                    onWorkflowClick={handleWorkflowClick}
                  />
                </div>
              </div>
            )}

            {/* Autonomy tab */}
            {activeTab === 'autonomy' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <BrandBadge variant="yellow">SETTINGS</BrandBadge>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Autonomy level</h2>
                  </div>
                  <AutonomyLevelSelector 
                    currentLevel={level} 
                    onLevelChange={setLevel} 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BrandBadge variant="sage">APPROVALS</BrandBadge>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">Pending Actions</h2>
                    </div>
                  <ActionApprovalPanel 
                    actions={actions}
                    onApprove={(id) => executeAction({ actionId: id, decision: 'approve', approvalData: { approvedBy: 'user' } })}
                    onReject={(id) => executeAction({ actionId: id, decision: 'reject' })}
                    onUndo={(_id) => { /* Phase 5 — undo not yet supported by backend */ }}
                  />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BrandBadge variant="white">LOGS</BrandBadge>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">Decision History</h2>
                    </div>
                    <DecisionLogViewer 
                      decisions={actions.filter(a => a.status !== 'pending').map(a => ({
                        id: a.id,
                        action: a.action,
                        confidence: a.confidence,
                        riskLevel: a.riskLevel,
                        reasoning: a.reasoning,
                        dataUsed: a.dataUsed,
                        expectedOutcome: a.expectedOutcome,
                        status: a.status === 'approved' ? 'executed' : 'blocked',
                        createdAt: a.createdAt
                      }))}
                      insights={{
                        totalDataPoints: actions.length,
                        successRate: 0.94,
                        approvalRate: 0.88,
                        interventionRate: 0.12,
                        recommendations: [
                          'Orin is learning your preference for high-confidence Notion moves.',
                          'Consider switching to "Semi-Auto" for low-risk archiving.',
                        ]
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Analytics tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <BrandBadge variant="sage">METRICS</BrandBadge>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">System Analytics</h2>
                </div>
                
                {displayMetrics && <MetricsPanel metrics={displayMetrics} />}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <WorkflowStatusChart workflows={displayWorkflows} />
                  {displayMetrics && (
                    <ExecutionTimeChart 
                      history={[displayMetrics]} 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Alerts tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrandBadge variant="yellow">
                      {alerts.length > 0 ? `${alerts.length} ACTIVE` : 'CLEAR'}
                    </BrandBadge>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                      Alerts
                    </h2>
                  </div>
                  {alerts.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearAlerts}>
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="border-2 border-black rounded-2xl overflow-hidden">
                  <AlertList
                    alerts={alerts}
                    onDismiss={removeAlert}
                    onAcknowledge={acknowledgeAlert}
                    onClearAll={clearAlerts}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
