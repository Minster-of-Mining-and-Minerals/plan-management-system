import { PlanNode } from "@/redux/types/plan";

export type PlanAssignmentLabel = {
  type: "sector" | "department" | "user";
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
