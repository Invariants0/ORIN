"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { useWorkflow } from '@/hooks/queries/useWorkflowQueries';
import { StepList } from '@/components/features/workflow/StepList';
import { WorkflowStep } from '@/lib/types/workflow.types';
import { WorkflowActions } from '@/components/features/workflow/WorkflowActions';
import { Button } from '@/components/core/brand/Button';
import { Card } from '@/components/core/brand/Card';
import { BrandBadge as Badge } from '@/components/core/brand/Badge';
import { BrandProgress as Progress } from '@/components/core/brand/Progress';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ErrorBoundary } from '@/components/core/ErrorBoundary';

/**
 * WorkflowDetailPage — PRODUCTION VIEW
 * 
 * 1. Fetches detailed workflow state from TanStack Query.
 * 2. Subscribes to real-time step/status updates via WebSocket context.
 * 3. Reactive to cache updates from useEnhancedWebSocket.
 */
export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { data: workflow, isLoading, error } = useWorkflow(workflowId);
  const { subscribe, unsubscribe, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (!workflowId) return;
    
    // Connect to real-time events for this specific workflow
    subscribe(workflowId);
    
    return () => {
      unsubscribe(workflowId);
    };
  }, [workflowId, subscribe, unsubscribe]);

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

  if (error || !workflow) {
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

  const completedSteps = workflow.steps.filter((s: WorkflowStep) => s.status === 'completed').length;
  const totalSteps = workflow.steps.length;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background transition-colors duration-500">
        {/* Header */}
        <div className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/workflows')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-black uppercase tracking-tighter">{workflow.name}</h1>
                {workflow.description && (
                  <p className="text-sm font-bold text-black/40 uppercase tracking-widest">
                    {workflow.description}
                  </p>
                )}
              </div>
              <Badge variant={isConnected ? 'sage' : 'black'}>
                {isConnected ? '• LIVE STREAM' : '• OFFLINE'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-black/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Created: {format(new Date(workflow.createdAt), 'PPp')}</span>
                </div>

                {workflow.startTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      Active: {formatDistanceToNow(new Date(workflow.startTime), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              <WorkflowActions
                workflowId={workflowId}
                status={workflow.status}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Metadata & Progress */}
            <div className="space-y-6">
              <Card variant="white" className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6">Status Metrics</h3>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase text-black/40">Completion</span>
                      <span className="text-3xl font-black">{workflow.progress}%</span>
                    </div>
                    <Progress value={workflow.progress} className="h-4 border-2 border-black" />
                  </div>

                  <div className="pt-6 border-t-2 border-black/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-black/40">Current State</span>
                      <Badge variant="yellow">{workflow.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-black/40">Steps Executed</span>
                      <span className="text-sm font-black">
                        {completedSteps} / {totalSteps}
                      </span>
                    </div>

                    {workflow.metadata && Object.keys(workflow.metadata).length > 0 && (
                      <div className="pt-4 mt-4 border-t-2 border-black/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-3">Node Context</p>
                        <div className="space-y-2">
                          {Object.entries(workflow.metadata).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                              <span className="text-black/40">{key}:</span>
                              <span className="bg-neutral-100 px-2 py-0.5 border border-black/10 rounded">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right: Operational Timeline */}
            <div className="lg:col-span-2">
              <Card variant="white" className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#f8f9fa]">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black uppercase tracking-tighter">Execution Pipeline</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-black rounded-full" />
                    <div className="w-3 h-3 bg-[#ffe17c] rounded-full" />
                    <div className="w-3 h-3 bg-[#b7c6c2] rounded-full" />
                  </div>
                </div>
                <StepList steps={workflow.steps} />
              </Card>
            </div>

          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
