import { Alert } from '@/lib/types/workflow.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, XOctagon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    badgeVariant: 'secondary' as const,
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    badgeVariant: 'secondary' as const,
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    badgeVariant: 'destructive' as const,
  },
  critical: {
    icon: XOctagon,
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    badgeVariant: 'destructive' as const,
  },
};

export function AlertBanner({ alert, onDismiss, onAcknowledge }: AlertBannerProps) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={cn('border rounded-lg p-4', config.bgColor)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5', config.color)} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.badgeVariant} className="uppercase text-xs">
              {alert.severity}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm font-medium">{alert.message}</p>
          
          {alert.workflowId && (
            <p className="text-xs text-muted-foreground mt-1">
              Workflow ID: {alert.workflowId}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!alert.acknowledged && onAcknowledge && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAcknowledge(alert.id)}
            >
              Acknowledge
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
