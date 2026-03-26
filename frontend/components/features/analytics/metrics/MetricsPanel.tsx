import { SystemMetrics } from '@/lib/types/workflow.types';
import { Card } from '@/components/core/brand/Card';
import { Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsPanelProps {
  metrics: SystemMetrics | null;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 h-[100px] border-black/10">
            <div className="animate-pulse">
              <div className="h-2 bg-neutral-200 rounded w-24 mb-3" />
              <div className="h-6 bg-neutral-200 rounded w-16" />
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
      color: 'bg-[#ffe17c]',
      variant: 'yellow' as const,
    },
    {
      title: 'Completed',
      value: metrics.completedWorkflows,
      icon: CheckCircle2,
      color: 'bg-[#b7c6c2]',
      variant: 'sage' as const,
    },
    {
      title: 'Failed',
      value: metrics.failedWorkflows,
      icon: XCircle,
      color: 'bg-white',
      variant: 'white' as const,
    },
    {
      title: 'Queue Size',
      value: metrics.queueSize,
      icon: Clock,
      color: 'bg-neutral-100',
      variant: 'white' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.title} 
            variant={card.variant}
            className="p-6 border-2 border-black flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">{card.title}</p>
              <p className="text-3xl font-black tabular-nums">{card.value}</p>
            </div>
            <div className={cn(
              "w-12 h-12 border-2 border-black flex items-center justify-center",
              card.variant === 'white' ? "bg-neutral-50" : "bg-white"
            )}>
              <Icon className="w-6 h-6 text-black" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
