"use client";

import { useRouter } from 'next/navigation';
import { useWorkflows } from '@/hooks/queries/useWorkflowQueries';
import { useMetrics } from '@/hooks/queries/useMetricsQueries';
import { useAllWorkflows } from '@/hooks/useWorkflowSelectors';
import { useMetricsStore } from '@/stores/metrics.store';
import { useAlertsStore } from '@/stores/alerts.store';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { WorkflowList } from '@/components/workflow/WorkflowList';
import { Workflow } from '@/lib/types/workflow.types';
import { SystemMetrics } from '@/lib/types/workflow.types';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';
import { ExecutionTimeChart } from '@/components/charts/ExecutionTimeChart';
import { WorkflowStatusChart } from '@/components/charts/WorkflowStatusChart';
import { AlertList } from '@/components/alerts/AlertList';
import { ConnectionIndicator } from '@/components/connection/ConnectionIndicator';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

function isSystemMetrics(value: unknown): value is SystemMetrics {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.activeWorkflows === 'number' &&
    typeof candidate.completedWorkflows === 'number' &&
    typeof candidate.failedWorkflows === 'number' &&
    typeof candidate.queueSize === 'number' &&
    typeof candidate.averageExecutionTime === 'number' &&
    typeof candidate.successRate === 'number' &&
    typeof candidate.failureRate === 'number'
  );
}

export default function WorkflowsPage() {
  const router = useRouter();
  
  // React Query for server state
  const { data: workflowsData = [], isLoading, refetch } = useWorkflows();
  const { data: metricsData } = useMetrics();
  
  // Zustand for realtime state
  const workflows = useAllWorkflows();
  const { history } = useMetricsStore();
  const { alerts, removeAlert, acknowledgeAlert, clearAlerts } = useAlertsStore();
  
  // WebSocket connection
  useWebSocketContext();

  // Use workflows from Zustand if available (realtime), otherwise from React Query
  const displayWorkflows = Array.isArray(workflows) && workflows.length > 0
    ? workflows
    : (Array.isArray(workflowsData) ? workflowsData : []);
  const displayMetrics = isSystemMetrics(metricsData)
    ? metricsData
    : useMetricsStore.getState().metrics;

  const handleWorkflowClick = (workflow: Workflow) => {
    router.push(`/workflows/${workflow.id}`);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon">
                    <Home className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Workflow Monitor</h1>
                  <p className="text-sm text-muted-foreground">
                    Real-time workflow execution tracking
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ConnectionIndicator />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="alerts">
                Alerts
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {displayMetrics && <MetricsPanel metrics={displayMetrics} />}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {history.length > 0 && <ExecutionTimeChart history={history} />}
                {displayWorkflows.length > 0 && <WorkflowStatusChart workflows={displayWorkflows} />}
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Workflows</h2>
                <WorkflowList
                  workflows={displayWorkflows.slice(0, 6)}
                  onWorkflowClick={handleWorkflowClick}
                />
              </div>
            </TabsContent>

            <TabsContent value="workflows">
              <WorkflowList
                workflows={displayWorkflows}
                onWorkflowClick={handleWorkflowClick}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {history.length > 0 && <ExecutionTimeChart history={history} />}
                {displayWorkflows.length > 0 && <WorkflowStatusChart workflows={displayWorkflows} />}
              </div>
            </TabsContent>

            <TabsContent value="alerts">
              <AlertList
                alerts={alerts}
                onDismiss={removeAlert}
                onAcknowledge={acknowledgeAlert}
                onClearAll={clearAlerts}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}
