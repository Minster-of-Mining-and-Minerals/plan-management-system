"use client";

import { Badge } from "@/components/ui/badge";
import type { ExecutionEvaluationStatus } from "@/redux/types/plan";
import { formatExecutionEvaluationStatus } from "@/utils/planExecutionEvaluationUtils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ExecutionEvaluationStatus, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  not_started: "bg-slate-50 text-slate-600 border-slate-200",
  no_evaluation: "bg-gray-50 text-gray-500 border-gray-200",
};

interface EvaluationStatusBadgeProps {
  status?: ExecutionEvaluationStatus | null;
  className?: string;
}

export function EvaluationStatusBadge({ status, className }: EvaluationStatusBadgeProps) {
  if (!status) return null;

  return (
    <Badge
      variant="outline"
      className={cn("font-normal text-xs", STATUS_STYLES[status], className)}
    >
      {formatExecutionEvaluationStatus(status)}
    </Badge>
  );
}
