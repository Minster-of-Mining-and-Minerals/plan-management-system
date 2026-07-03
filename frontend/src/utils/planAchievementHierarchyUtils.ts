import type { PlanNode, PlanNodeHierarchy } from "@/redux/types/plan";
import {
  PLAN_ACHIEVEMENT_STATUS,
  PlanAchievementStatus,
  resolvePlanAchievementStatus,
} from "@/utils/planAchievementWorkflowUtils";

export function flattenPlanHierarchy(nodes: PlanNodeHierarchy[]): PlanNodeHierarchy[] {
  const result: PlanNodeHierarchy[] = [];

  const walk = (list: PlanNodeHierarchy[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(nodes);
  return result;
}

export function collectPendingAchievementNodes(
  nodes: PlanNodeHierarchy[]
): PlanNodeHierarchy[] {
  return flattenPlanHierarchy(nodes).filter(
    (node) =>
      resolvePlanAchievementStatus(node) === PLAN_ACHIEVEMENT_STATUS.SUBMITTED &&
      node.period_actual != null
  );
}

export function collectPendingValidationNodes(
  nodes: PlanNodeHierarchy[]
): PlanNodeHierarchy[] {
  return flattenPlanHierarchy(nodes).filter(
    (node) =>
      resolvePlanAchievementStatus(node) === PLAN_ACHIEVEMENT_STATUS.APPROVED &&
      node.period_actual != null
  );
}

export function findAncestorPathIds(
  roots: PlanNodeHierarchy[],
  targetNodeId: string
): string[] | null {
  const walk = (
    list: PlanNodeHierarchy[],
    ancestors: string[]
  ): string[] | null => {
    for (const node of list) {
      if (node.plan_node_id === targetNodeId) {
        return ancestors;
      }

      if (node.children?.length) {
        const found = walk(node.children, [...ancestors, node.plan_node_id]);
        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  return walk(roots, []);
}

export function planAchievementExecutorHint(
  status: PlanAchievementStatus,
  options: { canSubmit?: boolean; isRollup?: boolean; awaitingValidation?: boolean } = {}
): string | null {
  if (options.isRollup) {
    return "Achievement is rolled up from child nodes.";
  }

  switch (status) {
    case PLAN_ACHIEVEMENT_STATUS.SUBMITTED:
      return "Submitted and awaiting approver action. Parent rollup updates after approval.";
    case PLAN_ACHIEVEMENT_STATUS.APPROVED:
      return options.awaitingValidation
        ? "Execution-approved and awaiting validation. Parent rollup updates after validation."
        : "Approved — this value counts toward parent progress.";
    case PLAN_ACHIEVEMENT_STATUS.VALIDATED:
      return "Validated — this value counts toward parent progress.";
    case PLAN_ACHIEVEMENT_STATUS.REJECTED:
      return "Rejected — update the value and resubmit.";
    case PLAN_ACHIEVEMENT_STATUS.EMPTY:
    default:
      return options.canSubmit
        ? "Enter achievement for this period and submit for approval."
        : null;
  }
}

export function canSetPeriodTargetOnNode(node: Pick<PlanNode, "children">): boolean {
  return !(node.children ?? []).some((child) => child.is_active !== false);
}
