import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pause, Play, XCircle } from 'lucide-react';
import { WorkflowStatus } from '@/lib/types/workflow.types';
import { pauseWorkflow, resumeWorkflow, cancelWorkflow } from '@/lib/api';
import { toast } from 'sonner';

interface WorkflowActionsProps {
  workflowId: string;
  status: WorkflowStatus;
  onActionComplete?: () => void;
}

export function WorkflowActions({ workflowId, status, onActionComplete }: WorkflowActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handlePause = async () => {
    setIsLoading(true);
    try {
      await pauseWorkflow(workflowId);
      toast.success('Workflow paused successfully');
      onActionComplete?.();
    } catch (error) {
      toast.error(`Failed to pause workflow: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      await resumeWorkflow(workflowId);
      toast.success('Workflow resumed successfully');
      onActionComplete?.();
    } catch (error) {
      toast.error(`Failed to resume workflow: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await cancelWorkflow(workflowId);
      toast.success('Workflow cancelled successfully');
      setShowCancelDialog(false);
      onActionComplete?.();
    } catch (error) {
      toast.error(`Failed to cancel workflow: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
            Pause
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
            Resume
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
              Yes, cancel workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
