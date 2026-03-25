import { JSX, useEffect, useRef } from "react";
import { useCommandCenterStore } from "@/stores/useCommandCenterStore";
import { ExecutionBlock } from "./ExecutionBlock";

export function ExecutionLog(): JSX.Element {
  const { executionLogs } = useCommandCenterStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executionLogs]);

  if (executionLogs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
        <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-900 mb-4">
          <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <p className="font-medium text-sm">System ready.</p>
        <p className="text-xs mt-1">Awaiting command execution...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-8 overflow-y-auto no-scrollbar">
      {executionLogs.map((log) => (
        <ExecutionBlock key={log.id} log={log} />
      ))}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
