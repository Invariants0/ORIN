import { JSX } from "react";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { ExecutionLogItem } from "@/stores/useCommandCenterStore";

export function ExecutionBlock({ log }: { log: ExecutionLogItem }): JSX.Element {
  
  // Format time (e.g. 10:42 AM)
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  };

  // Split command to highlight the action
  const commandParts = log.command.split(" ");
  const action = commandParts[0];
  const args = commandParts.slice(1).join(" ");

  return (
    <div className="relative pl-6 pb-10 group">
      {/* Decorative timeline line */}
      <div className="absolute left-0 top-3 bottom-[-1rem] w-0.5 bg-zinc-200 dark:bg-zinc-800 transition-colors group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700" />
      
      {/* Command execution header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center mt-[-4px]">
          <div className="font-mono text-[13px] bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            <span className="font-semibold">{action}</span> <span className="text-zinc-500 dark:text-zinc-400">{args}</span>
          </div>
        </div>
        <div className="text-xs text-zinc-400 font-medium">
          {formatTime(log.timestamp)}
        </div>
      </div>

      {/* Summary block */}
      <div className="mb-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pr-8">
        {log.summary}
        {log.status === 'loading' && (
          <span className="inline-flex ml-2">
            <span className="animate-pulse text-blue-500">•••</span>
          </span>
        )}
      </div>

      {/* Steps checklist */}
      {log.steps && log.steps.length > 0 && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 space-y-3 font-mono text-[13px]">
          {log.steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                {step.completed ? (
                  <Check className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                ) : log.status === 'loading' && log.steps.find(s => !s.completed)?.id === step.id ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                )}
              </div>
              <span className={step.completed ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600"}>
                {step.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
