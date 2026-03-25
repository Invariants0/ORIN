import { JSX } from "react";
import { Database, FileText, Layers, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pipeline } from "@/stores/useCommandCenterStore";

interface PipelineItemProps {
  pipeline: Pipeline;
  isActive: boolean;
  onClick: () => void;
}

export function PipelineItem({ pipeline, isActive, onClick }: PipelineItemProps): JSX.Element {
  // Simple icon selector based on title keywords
  const getIcon = () => {
    if (pipeline.title.toLowerCase().includes("data") || pipeline.title.toLowerCase().includes("database")) return <Database className="w-4 h-4" />;
    if (pipeline.title.toLowerCase().includes("api")) return <FileJson className="w-4 h-4" />;
    if (pipeline.title.toLowerCase().includes("analysis")) return <Layers className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
        isActive 
          ? "bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 font-medium shadow-sm"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
      )}
    >
      <span className={cn(isActive ? "text-blue-500" : "text-zinc-400 dark:text-zinc-500")}>
        {getIcon()}
      </span>
      <span className="truncate">{pipeline.title}</span>
    </button>
  );
}
