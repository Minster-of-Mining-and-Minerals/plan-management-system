"use client";

import { Building, Layers, Shield, User } from "lucide-react";
import { PlanNode } from "@/redux/types/plan";
import { cn } from "@/lib/utils";
import {
  formatPlanAssignmentSummary,
  getPlanNodeAssignmentLabels,
  PlanAssignmentLabel,
} from "@/utils/planAssignmentUtils";

function AssignmentIcon({ type }: { type: PlanAssignmentLabel["type"] }) {
  if (type === "sector") {
    return <Building className="h-3 w-3 shrink-0" />;
  }
  if (type === "department") {
    return <Layers className="h-3 w-3 shrink-0" />;
  }
  if (type === "role" || type === "permission_group") {
    return <Shield className="h-3 w-3 shrink-0" />;
  }
  return <User className="h-3 w-3 shrink-0" />;
}

interface PlanNodeAssignmentSummaryProps {
  node: PlanNode;
  className?: string;
  emptyLabel?: string;
}

export function PlanNodeAssignmentSummary({
  node,
  className,
  emptyLabel = "Unassigned",
}: PlanNodeAssignmentSummaryProps) {
  const labels = getPlanNodeAssignmentLabels(node);
  const summary = formatPlanAssignmentSummary(labels);
  const isEmpty = labels.length === 0;
  const primaryType = labels[0]?.type;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs min-w-0",
        isEmpty ? "text-gray-400 italic" : "text-gray-600",
        className
      )}
      title={isEmpty ? undefined : labels.map((label) => label.name).join(", ")}
    >
      {!isEmpty && primaryType && <AssignmentIcon type={primaryType} />}
      <span className="truncate">{isEmpty ? emptyLabel : summary}</span>
    </span>
  );
}
