import { JSX } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { LogStatus } from "@/stores/useCommandCenterStore";

export function StatusBadge({ status }: { status: LogStatus }): JSX.Element {
  if (status === "loading") {
    return (
      <div className="flex items-center text-blue-500 gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-xs font-medium border border-blue-500/20">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Executing</span>
      </div>
    );
  }
  
  if (status === "error") {
    return (
      <div className="flex items-center text-red-500 gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-xs font-medium border border-red-500/20">
        <XCircle className="w-3 h-3" />
        <span>Failed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-emerald-500 gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-xs font-medium border border-emerald-500/20">
      <CheckCircle2 className="w-3 h-3" />
      <span>Done</span>
    </div>
  );
}
