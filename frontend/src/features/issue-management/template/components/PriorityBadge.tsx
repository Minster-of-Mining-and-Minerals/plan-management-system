"use client";

import { Badge } from "@/components/ui/badge";
import type { IssuePriority } from "@/redux/types/issue";

interface PriorityBadgeProps {
  priority?: IssuePriority | null;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (!priority) return null;

  return (
    <Badge
      variant="outline"
      style={{
        borderColor: priority.color_hex || undefined,
        color: priority.color_hex || undefined,
      }}
    >
      {priority.label}
    </Badge>
  );
}
