import { WorkflowStep } from '@/lib/types/workflow.types';
import { Badge } from '@/components/core/ui/badge';
import { CheckCircle2, XCircle, Loader2, Clock, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface StepItemProps {
  step: WorkflowStep;
  isLast?: boolean;
}

const statusConfig = {
  pending: { color: 'text-gray-400', bgColor: 'bg-gray-100', icon: Clock, label: 'Pending' },
  running: { color: 'text-blue-500', bgColor: 'bg-blue-50', icon: Loader2, label: 'Running' },
  completed: { color: 'text-green-500', bgColor: 'bg-green-50', icon: CheckCircle2, label: 'Completed' },
  failed: { color: 'text-red-500', bgColor: 'bg-red-50', icon: XCircle, label: 'Failed' },
  skipped: { color: 'text-gray-400', bgColor: 'bg-gray-50', icon: MinusCircle, label: 'Skipped' },
};

export function StepItem({ step, isLast }: StepItemProps) {
  const config = statusConfig[step.status];
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('rounded-full p-2', config.bgColor)}>
          <Icon className={cn('w-5 h-5', config.color, step.status === 'running' && 'animate-spin')} />
        </div>
        {!isLast && <div className="w-0.5 h-full bg-border mt-2" />}
      </div>

      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium">{step.name}</h4>
            {step.startTime && (
              <p className="text-sm text-muted-foreground">
                Started {formatDistanceToNow(new Date(step.startTime), { addSuffix: true })}
              </p>
            )}
          </div>
          <Badge variant="secondary">{config.label}</Badge>
        </div>

        {step.duration && (
          <p className="text-sm text-muted-foreground mb-2">
            Duration: {Math.round(step.duration / 1000)}s
          </p>
        )}

        {step.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
            <p className="text-sm text-red-800 font-medium mb-1">Error</p>
            <p className="text-sm text-red-700">{step.error}</p>
          </div>
        )}

        {step.logs && step.logs.length > 0 && (
          <div className="bg-muted rounded-md p-3 mt-2">
            <p className="text-sm font-medium mb-2">Logs</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {step.logs.map((log, idx) => (
                <p key={idx} className="text-xs font-mono text-muted-foreground">
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
