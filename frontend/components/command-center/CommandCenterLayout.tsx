import { JSX } from "react";
import { Sidebar } from "./Sidebar";
import { ExecutionLog } from "./ExecutionLog";
import { CommandInput } from "./CommandInput";
import { useCommandCenterStore } from "@/stores/useCommandCenterStore";
import { useCommandCenterWebSocket } from "@/hooks/useCommandCenterWebSocket";

export function CommandCenterLayout(): JSX.Element {
  // Initialize realtime connection
  useCommandCenterWebSocket();
  const { currentSessionId, pipelines } = useCommandCenterStore();
  
  const currentPipeline = pipelines.find(p => p.id === currentSessionId);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/50 dark:bg-[#09090b]/50 backdrop-blur-sm z-10">
          <h1 className="text-lg font-semibold tracking-tight">
            {currentPipeline?.title || "Command Center"}
          </h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Synced to Notion
            </span>
          </div>
        </header>

        {/* Workspace Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-dot-[#000000]/[0.05] dark:bg-dot-[#ffffff]/[0.05]">
          <ExecutionLog />
          <div className="shrink-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#09090b] dark:via-[#09090b]/80">
            <CommandInput />
          </div>
        </main>
      </div>
    </div>
  );
}
