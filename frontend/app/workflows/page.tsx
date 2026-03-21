"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useMetricsStore } from '@/stores/metrics.store';
import { useAlertsStore } from '@/stores/alerts.store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getWorkflows, getWorkflowMetrics } from '@/lib/api';
import { WorkflowList } from '@/components/workflow/WorkflowList';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';
import { ExecutionTimeChart } from '@/components/charts/ExecutionTimeChart';
import { WorkflowStatusChart } from '@/components/charts/WorkflowStatusChart';
import { AlertList } from '@/components/alerts/AlertList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Home } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WorkflowsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const { workflows, setWorkflows } = useWorkflowStore();
  const { metrics, history } = useMetricsStore();
  const { alerts, removeAlert, acknowledgeAlert, clearAlerts } = useAlertsStore();
  const { isConnected } = useWebSocket();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workflowsRes, metricsRes] = await Promise.all([
        getWorkflows(),
        getWorkflowMetrics(),
      ]);

      setWorkflows(workflowsRes.data || []);
      
      if (metricsRes.data) {
        useMetricsStore.getState().updateMetrics(metricsRes.data);
      }
    } catch (error) {
      toast.error(`Failed to load data: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowClick = (workflow: any) => {
    router.push(`/workflows/${workflow.id}`);
  };

  return (
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
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
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
            <MetricsPanel metrics={metrics} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {history.length > 0 && <ExecutionTimeChart history={history} />}
              {workflows.length > 0 && <WorkflowStatusChart workflows={workflows} />}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Workflows</h2>
              <WorkflowList
                workflows={workflows.slice(0, 6)}
                onWorkflowClick={handleWorkflowClick}
              />
            </div>
          </TabsContent>

          <TabsContent value="workflows">
            <WorkflowList
              workflows={workflows}
              onWorkflowClick={handleWorkflowClick}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {history.length > 0 && <ExecutionTimeChart history={history} />}
              {workflows.length > 0 && <WorkflowStatusChart workflows={workflows} />}
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
  );
}
