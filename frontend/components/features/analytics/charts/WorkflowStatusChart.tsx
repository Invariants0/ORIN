import { Card } from '@/components/core/brand/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Workflow } from '@/lib/types/workflow.types';

interface WorkflowStatusChartProps {
  workflows: Workflow[];
}

export function WorkflowStatusChart({ workflows }: WorkflowStatusChartProps) {
  const statusCounts = workflows.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = [
    { name: 'Pending', count: statusCounts.pending || 0, fill: 'hsl(var(--muted))' },
    { name: 'Running', count: statusCounts.running || 0, fill: 'hsl(220, 90%, 56%)' },
    { name: 'Paused', count: statusCounts.paused || 0, fill: 'hsl(45, 93%, 47%)' },
    { name: 'Completed', count: statusCounts.completed || 0, fill: 'hsl(142, 71%, 45%)' },
    { name: 'Failed', count: statusCounts.failed || 0, fill: 'hsl(0, 84%, 60%)' },
    { name: 'Cancelled', count: statusCounts.cancelled || 0, fill: 'hsl(var(--muted-foreground))' },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Workflow Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
