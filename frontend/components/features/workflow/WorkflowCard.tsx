import { Workflow } from '@/lib/types/workflow.types';
import { Card } from '@/components/core/ui/card';
import { Badge } from '@/components/core/ui/badge';
import { Progress } from '@/components/core/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle2, XCircle, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface WorkflowCardProps {
  workflow: Workflow;
  onClick?: () => void;
}

const statusConfig = {
  pending: { color: 'bg-gray-500', icon: Clock, label: 'Pending' },
  running: { color: 'bg-blue-500', icon: Loader2, label: 'Running' },
  paused: { color: 'bg-yellow-500', icon: Pause, label: 'Paused' },
  completed: { color: 'bg-green-500', icon: CheckCircle2, label: 'Completed' },
  failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
  cancelled: { color: 'bg-gray-500', icon: XCircle, label: 'Cancelled' },
};

export const WorkflowCard = memo(function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const config = statusConfig[workflow.status];
  const Icon = config.icon;

  const completedSteps = workflow.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = workflow.steps.length;

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer hover:shadow-lg transition-shadow',
        onClick && 'hover:border-primary'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{workflow.name}</h3>
          {workflow.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workflow.description}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="ml-2">
          <Icon className={cn('w-3 h-3 mr-1', workflow.status === 'running' && 'animate-spin')} />
          {config.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{workflow.progress}%</span>
        </div>
        <Progress value={workflow.progress} className="h-2" />

        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-muted-foreground">
            Steps: {completedSteps}/{totalSteps}
          </span>
          {workflow.startTime && (
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(workflow.startTime), { addSuffix: true })}
            </span>
          )}
        </div>

        {workflow.duration && (
          <div className="text-sm text-muted-foreground">
            Duration: {Math.round(workflow.duration / 1000)}s
          </div>
        )}
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.workflow.id === nextProps.workflow.id &&
    prevProps.workflow.status === nextProps.workflow.status &&
    prevProps.workflow.progress === nextProps.workflow.progress &&
    prevProps.workflow.updatedAt === nextProps.workflow.updatedAt
  );
});
