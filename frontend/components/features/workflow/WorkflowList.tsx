import { Workflow } from '@/lib/types/workflow.types';
import { WorkflowCard } from './WorkflowCard';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowClick?: (workflow: Workflow) => void;
}

export function WorkflowList({ workflows, onWorkflowClick }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No workflows found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          onClick={() => onWorkflowClick?.(workflow)}
        />
      ))}
    </div>
  );
}
