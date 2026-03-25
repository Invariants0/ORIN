import { JSX } from "react";
import { Plus, TerminalSquare, Circle } from "lucide-react";
import { useCommandCenterStore } from "@/stores/useCommandCenterStore";
import { PipelineItem } from "./PipelineItem";

export function Sidebar(): JSX.Element {
  const { currentSessionId, setCurrentSessionId, pipelines, connectionStatus } = useCommandCenterStore();

  const todayPipelines = pipelines.filter(p => p.category === "today");
  const previousPipelines = pipelines.filter(p => p.category === "previous");

  return (
    <div className="w-64 flex flex-col h-full bg-zinc-50/50 dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-zinc-800">
      {/* Header section */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
            <TerminalSquare className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">ORIN Workspace</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Circle className={`w-2 h-2 fill-current ${connectionStatus === 'connected' ? 'text-blue-500' : connectionStatus === 'connecting' ? 'text-yellow-500 animate-pulse' : 'text-zinc-500'}`} />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{connectionStatus}</span>
            </div>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          New Pipeline
        </button>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {todayPipelines.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase px-1">Today</h3>
            <div className="space-y-1">
              {todayPipelines.map(p => (
                <PipelineItem 
                  key={p.id} 
                  pipeline={p} 
                  isActive={currentSessionId === p.id} 
                  onClick={() => setCurrentSessionId(p.id)} 
                />
              ))}
            </div>
          </div>
        )}

        {previousPipelines.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase px-1">Previous 7 Days</h3>
            <div className="space-y-1">
              {previousPipelines.map(p => (
                <PipelineItem 
                  key={p.id} 
                  pipeline={p} 
                  isActive={currentSessionId === p.id} 
                  onClick={() => setCurrentSessionId(p.id)} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
