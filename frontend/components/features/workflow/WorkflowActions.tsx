import { useState } from 'react';
import { Button } from '@/components/core/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/core/ui/dialog';
import { Pause, Play, XCircle } from 'lucide-react';
import { WorkflowStatus } from '@/lib/types/workflow.types';
import { usePauseWorkflow, useResumeWorkflow, useCancelWorkflow } from '@/hooks/queries/useWorkflowQueries';
import { toast } from 'sonner';

interface WorkflowActionsProps {
  workflowId: string;
  status: WorkflowStatus;
}

export function WorkflowActions({ workflowId, status }: WorkflowActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const pauseMutation = usePauseWorkflow();
  const resumeMutation = useResumeWorkflow();
  const cancelMutation = useCancelWorkflow();

  const handlePause = () => {
    pauseMutation.mutate(workflowId, {
      onSuccess: () => toast.success('Workflow paused successfully'),
      onError: (error) => toast.error(`Failed to pause workflow: ${error.message}`),
    });
  };

  const handleResume = () => {
    resumeMutation.mutate(workflowId, {
      onSuccess: () => toast.success('Workflow resumed successfully'),
      onError: (error) => toast.error(`Failed to resume workflow: ${error.message}`),
    });
  };

  const handleCancel = () => {
    cancelMutation.mutate(workflowId, {
      onSuccess: () => {
        toast.success('Workflow cancelled successfully');
        setShowCancelDialog(false);
      },
      onError: (error) => toast.error(`Failed to cancel workflow: ${error.message}`),
    });
  };

  const isLoading = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;
  const canPause = status === 'running';
  const canResume = status === 'paused';
  const canCancel = status === 'running' || status === 'paused';

  return (
    <>
      <div className="flex gap-2">
        {canPause && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={isLoading}
          >
            <Pause className="w-4 h-4 mr-2" />
            {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
          </Button>
        )}

        {canResume && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResume}
            disabled={isLoading}
          >
            <Play className="w-4 h-4 mr-2" />
            {resumeMutation.isPending ? 'Resuming...' : 'Resume'}
          </Button>
        )}

        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            disabled={isLoading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this workflow? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isLoading}
            >
              No, keep it
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, cancel workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
