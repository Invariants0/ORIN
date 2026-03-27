import { WorkflowStep } from '@/lib/types/workflow.types';
import { StepItem } from './StepItem';

interface StepListProps {
  steps: WorkflowStep[];
}

export function StepList({ steps }: StepListProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No steps defined
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <StepItem key={step.id} step={step} isLast={index === steps.length - 1} />
      ))}
    </div>
  );
}
