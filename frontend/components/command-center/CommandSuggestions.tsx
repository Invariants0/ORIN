import { JSX } from "react";
import { FileText, Search, Settings, Pickaxe } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandSuggestionsProps {
  isVisible: boolean;
  query: string;
  onSelect: (cmd: string) => void;
}

const COMMANDS = [
  { cmd: "/store", desc: "Extract URL content or save text blocks", icon: <FileText className="w-4 h-4" /> },
  { cmd: "/analyze", desc: "Run structural analysis on memory", icon: <Search className="w-4 h-4" /> },
  { cmd: "/build", desc: "Construct Notion hierarchy from ideas", icon: <Pickaxe className="w-4 h-4" /> },
  { cmd: "/execute", desc: "Execute a defined workflow step", icon: <Settings className="w-4 h-4" /> }
];

export function CommandSuggestions({ isVisible, query, onSelect }: CommandSuggestionsProps): JSX.Element | null {
  if (!isVisible) return null;

  const filteredCommands = COMMANDS.filter(c => c.cmd.startsWith(query.toLowerCase()) || query === "/");

  if (filteredCommands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 w-80 mb-2 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-150 z-50">
      <div className="px-3 py-2 text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        Available Commands
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {filteredCommands.map((command, idx) => (
          <button
            key={command.cmd}
            onClick={() => onSelect(command.cmd)}
            className={cn(
              "w-full flex flex-col text-left px-3 py-2 rounded-md transition-colors",
              idx === 0 ? "bg-zinc-100 dark:bg-zinc-800/70" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-zinc-400 dark:text-zinc-500">{command.icon}</span>
              <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">{command.cmd}</span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 pl-6">{command.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
