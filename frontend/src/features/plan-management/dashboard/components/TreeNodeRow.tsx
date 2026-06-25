"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardProgressNode } from "../types";
import { ProgressBar } from "./ProgressBar";
import { SharingBadge, StatusBadge } from "./StatusBadge";

interface TreeNodeRowProps {
  node: DashboardProgressNode;
  depth?: number;
  defaultExpanded?: boolean;
}

export function TreeNodeRow({
  node,
  depth = 0,
  defaultExpanded = depth < 1,
}: TreeNodeRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-white px-3 py-3 transition-colors hover:bg-gray-50/80",
          depth > 0 && "ml-4 sm:ml-6"
        )}
        style={{ marginLeft: depth > 0 ? depth * 16 : 0 }}
      >
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          onClick={() => hasChildren && setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <GitBranch className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-golden-dark truncate">{node.title}</span>
            <SharingBadge mode={node.sharingMode} />
            <StatusBadge status={node.status} />
          </div>
          <ProgressBar
            value={node.has_progress === false ? 0 : node.progress}
            size="sm"
          />
          {node.has_progress === false && (
            <p className="text-[10px] text-muted-foreground">No achievement recorded yet</p>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="mt-2 space-y-2 border-l border-dashed border-gray-200 pl-2 ml-3">
          {node.children!.map((child) => (
            <TreeNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
