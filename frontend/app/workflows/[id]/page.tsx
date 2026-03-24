"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { useWorkflow } from '@/hooks/queries/useWorkflowQueries';
import { useCurrentWorkflow } from '@/hooks/useWorkflowSelectors';
import { StepList } from '@/components/workflow/StepList';
import { WorkflowStep } from '@/lib/types/workflow.types';
import { WorkflowActions } from '@/components/workflow/WorkflowActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  
  const { setCurrentWorkflowId } = useWorkflowStore();
  const currentWorkflow = useCurrentWorkflow();
  const { data: workflow, isLoading, error } = useWorkflow(workflowId);
  const { subscribe, unsubscribe, isConnected } = useWebSocketContext();

  useEffect(() => {
    // Set current workflow ID in store
    setCurrentWorkflowId(workflowId);
    
    // Subscribe to real-time updates
    subscribe(workflowId);

    return () => {
      unsubscribe(workflowId);
      setCurrentWorkflowId(null);
    };
  }, [workflowId, setCurrentWorkflowId, subscribe, unsubscribe]);

  // Use workflow from React Query or Zustand (whichever is available)
  const displayWorkflow = workflow || currentWorkflow;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !displayWorkflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">
            {error ? 'Failed to load workflow' : 'Workflow not found'}
          </p>
          <Button onClick={() => router.push('/workflows')}>
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  const completedSteps = displayWorkflow.steps.filter((s: WorkflowStep) => s.status === 'completed').length;
  const totalSteps = displayWorkflow.steps.length;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/workflows')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{displayWorkflow.name}</h1>
                {displayWorkflow.description && (
                  <p className="text-sm text-muted-foreground">
                    {displayWorkflow.description}
                  </p>
                )}
              </div>
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Live' : 'Offline'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(displayWorkflow.createdAt), 'PPp')}</span>
                </div>
                
                {displayWorkflow.startTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Started:</span>
                    <span>
                      {formatDistanceToNow(new Date(displayWorkflow.startTime), { addSuffix: true })}
                    </span>
                  </div>
                )}

                {displayWorkflow.duration && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{Math.round(displayWorkflow.duration / 1000)}s</span>
                  </div>
                )}
              </div>

              <WorkflowActions
                workflowId={workflowId}
                status={displayWorkflow.status}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Card */}
            <Card className="p-6 lg:col-span-1">
              <h3 className="font-semibold mb-4">Progress</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Overall</span>
                    <span className="text-2xl font-bold">{displayWorkflow.progress}%</span>
                  </div>
                  <Progress value={displayWorkflow.progress} className="h-3" />
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge>{displayWorkflow.status}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Steps</span>
                    <span className="font-medium">
                      {completedSteps} / {totalSteps}
                    </span>
                  </div>

                  {displayWorkflow.metadata && Object.keys(displayWorkflow.metadata).length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Metadata</p>
                      <div className="space-y-1">
                        {Object.entries(displayWorkflow.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Steps Timeline */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="font-semibold mb-6">Execution Timeline</h3>
              <StepList steps={displayWorkflow.steps} />
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
