"use client";

import { Brain, PenTool } from "lucide-react";
import { Button } from "@/components/core/ui/button";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: "explore" | "build";
  onModeChange: (mode: "explore" | "build") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
      <Button
        variant={mode === "explore" ? "default" : "ghost"}
        size="sm"
        onClick={() => onModeChange("explore")}
        className="gap-2"
      >
        <Brain className="h-4 w-4" />
        Explore
      </Button>
      <Button
        variant={mode === "build" ? "default" : "ghost"}
        size="sm"
        onClick={() => onModeChange("build")}
        className="gap-2"
      >
        <PenTool className="h-4 w-4" />
        Build
      </Button>
    </div>
  );
}
