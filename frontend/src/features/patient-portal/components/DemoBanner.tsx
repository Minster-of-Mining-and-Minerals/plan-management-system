"use client";

import { Sparkles } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span>
        Demo experience — data shown is static for presentation. Live records
        connect when modules are integrated.
      </span>
    </div>
  );
}
