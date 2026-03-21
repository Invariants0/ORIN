import { SystemMetrics } from '@/lib/types/workflow.types';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface ExecutionTimeChartProps {
  history: SystemMetrics[];
}

export function ExecutionTimeChart({ history }: ExecutionTimeChartProps) {
  const data = history.map((m) => ({
    time: format(new Date(m.timestamp), 'HH:mm:ss'),
    avgTime: Math.round(m.averageExecutionTime / 1000), // Convert to seconds
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Average Execution Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="time"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Line
            type="monotone"
            dataKey="avgTime"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
