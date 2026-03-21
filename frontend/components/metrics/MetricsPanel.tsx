import { SystemMetrics } from '@/lib/types/workflow.types';
import { Card } from '@/components/ui/card';
import { Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface MetricsPanelProps {
  metrics: SystemMetrics | null;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Active Workflows',
      value: metrics.activeWorkflows,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completed',
      value: metrics.completedWorkflows,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Failed',
      value: metrics.failedWorkflows,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Queue Size',
      value: metrics.queueSize,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
              <div className={`rounded-full p-3 ${card.bgColor}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
