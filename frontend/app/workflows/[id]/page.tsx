"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getWorkflowById } from '@/lib/api';
import { StepList } from '@/components/workflow/StepList';
import { WorkflowActions } from '@/components/workflow/WorkflowActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const { currentWorkflow, setCurrentWorkflow } = useWorkflowStore();
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    loadWorkflow();
    
    // Subscribe to real-time updates
    subscribe(workflowId);

    return () => {
      unsubscribe(workflowId);
    };
  }, [workflowId]);

  const loadWorkflow = async () => {
    setIsLoading(true);
    try {
      const response = await getWorkflowById(workflowId);
      setCurrentWorkflow(response.data);
    } catch (error) {
      toast.error(`Failed to load workflow: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!currentWorkflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Workflow not found</p>
          <Button onClick={() => router.push('/workflows')}>
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  const completedSteps = currentWorkflow.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = currentWorkflow.steps.length;

  return (
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
              <h1 className="text-2xl font-bold">{currentWorkflow.name}</h1>
              {currentWorkflow.description && (
                <p className="text-sm text-muted-foreground">
                  {currentWorkflow.description}
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
                <span>{format(new Date(currentWorkflow.createdAt), 'PPp')}</span>
              </div>
              
              {currentWorkflow.startTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Started:</span>
                  <span>
                    {formatDistanceToNow(new Date(currentWorkflow.startTime), { addSuffix: true })}
                  </span>
                </div>
              )}

              {currentWorkflow.duration && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{Math.round(currentWorkflow.duration / 1000)}s</span>
                </div>
              )}
            </div>

            <WorkflowActions
              workflowId={workflowId}
              status={currentWorkflow.status}
              onActionComplete={loadWorkflow}
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
                  <span className="text-2xl font-bold">{currentWorkflow.progress}%</span>
                </div>
                <Progress value={currentWorkflow.progress} className="h-3" />
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge>{currentWorkflow.status}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Steps</span>
                  <span className="font-medium">
                    {completedSteps} / {totalSteps}
                  </span>
                </div>

                {currentWorkflow.metadata && Object.keys(currentWorkflow.metadata).length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Metadata</p>
                    <div className="space-y-1">
                      {Object.entries(currentWorkflow.metadata).map(([key, value]) => (
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
            <StepList steps={currentWorkflow.steps} />
          </Card>
        </div>
      </div>
    </div>
  );
}
