import { JSX, useState, useRef, useEffect, KeyboardEvent } from "react";
import { ChevronRight } from "lucide-react";
import { CommandSuggestions } from "./CommandSuggestions";
import { useCommandCenterStore } from "@/stores/useCommandCenterStore";

export function CommandInput(): JSX.Element {
  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { addLog, addCommandToHistory } = useCommandCenterStore();

  useEffect(() => {
    // Focus automatically
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    setShowSuggestions(val.startsWith("/"));
  };

  const executeCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    
    // Process command execution
    addCommandToHistory(cmd);
    
    // Add optimistic log to state
    addLog({
      id: `log-${Date.now()}`,
      command: cmd,
      timestamp: new Date(),
      status: 'loading',
      summary: "Initializing execution...",
      steps: [
        { id: `s1-${Date.now()}`, text: "Resolving intent and context", completed: false }
      ]
    });

    // Reset input
    setValue("");
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand(value);
    }
    // Handle Esc to close suggestions
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-4 px-4 sm:px-8">
      <CommandSuggestions 
        isVisible={showSuggestions} 
        query={value.split(" ")[0]} 
        onSelect={(cmd) => {
          setValue(cmd + " ");
          setShowSuggestions(false);
          inputRef.current?.focus();
        }} 
      />
      
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <ChevronRight className="w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter a command... (e.g. /store, /analyze)"
          className="w-full bg-white dark:bg-[#121214] border border-zinc-300 dark:border-zinc-700 rounded-lg pl-11 pr-16 py-4 text-sm font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          autoComplete="off"
          spellCheck="false"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center gap-1 font-sans text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
            ENTER
          </kbd>
        </div>
      </div>
    </div>
  );
}
