import { Alert } from '@/lib/types/workflow.types';
import { AlertBanner } from './AlertBanner';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface AlertListProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onClearAll?: () => void;
}

export function AlertList({ alerts, onDismiss, onAcknowledge, onClearAll }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No alerts
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Alerts ({alerts.length})
        </h3>
        {onClearAll && alerts.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertBanner
            key={alert.id}
            alert={alert}
            onDismiss={onDismiss}
            onAcknowledge={onAcknowledge}
          />
        ))}
      </div>
    </div>
  );
}
