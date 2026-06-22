import { PlanNode } from "@/redux/types/plan";

export const PLAN_NODE_ASSIGNMENT_TYPE_LABELS: Record<PlanNode["type"], string> = {
  strategic: "Strategic Focus Area",
  goal: "Goal",
  kpi: "KPI",
  task: "Activity",
};

export function getPlanNodeAssignmentTypeLabel(
  nodeType: PlanNode["type"] | string | undefined
): string {
  if (!nodeType) return "Node";
  return (
    PLAN_NODE_ASSIGNMENT_TYPE_LABELS[nodeType as PlanNode["type"]] ??
    nodeType.charAt(0).toUpperCase() + nodeType.slice(1)
  );
}

export function formatPlanAssignmentButtonLabel(
  nodeType: PlanNode["type"] | string | undefined,
  options?: { reassign?: boolean; allBranches?: boolean }
): string {
  const typeLabel = getPlanNodeAssignmentTypeLabel(nodeType);
  const prefix = options?.reassign ? "Reassign" : "Assign";

  if (options?.allBranches) {
    return `${prefix} ${typeLabel} to All Branches`;
  }

  return `${prefix} ${typeLabel}`;
}

export type PlanAssignmentLabel = {
  type: "sector" | "department" | "user" | "role" | "permission_group";
  name: string;
};

export function getPlanNodeAssignmentLabels(node: PlanNode): PlanAssignmentLabel[] {
  const labels: PlanAssignmentLabel[] = [];

  for (const assignment of node.externalAssignments?.filter((item) => item.is_active) ?? []) {
    const name = assignment.governmentStructure?.name;
    if (name) {
      labels.push({ type: "sector", name });
    }
  }

  for (const assignment of node.internalAssignments?.filter((item) => item.is_active) ?? []) {
    if (assignment.user?.full_name) {
      labels.push({ type: "user", name: assignment.user.full_name });
    } else if (assignment.internalStructure?.name) {
      labels.push({ type: "department", name: assignment.internalStructure.name });
    } else if (assignment.role?.name) {
      labels.push({ type: "role", name: assignment.role.name });
    } else if (assignment.permissionGroup?.name) {
      labels.push({ type: "permission_group", name: assignment.permissionGroup.name });
    }
  }

  return labels;
}

export function formatPlanAssignmentSummary(
  labels: PlanAssignmentLabel[],
  maxVisible = 2
): string {
  if (labels.length === 0) {
    return "Unassigned";
  }

  const names = labels.map((label) => label.name);
  if (names.length <= maxVisible) {
    return names.join(", ");
  }

  return `${names.slice(0, maxVisible).join(", ")} +${names.length - maxVisible}`;
}
