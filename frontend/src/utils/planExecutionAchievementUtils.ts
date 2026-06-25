import { PlanNode, PlanRule } from "@/redux/types/plan";
import { stepRequiresWeight } from "@/utils/planRuleUtils";

export const OVERRIDE_PARENT_ACHIEVEMENT_PERMISSION = "plan:override_parent_achievement";

export type AchievementEntryMode = "leaf" | "rollup" | "parent_override";

export function hasActiveChildNodes(node: Pick<PlanNode, "children">): boolean {
    return (node.children ?? []).some((child) => child.is_active !== false);
}

export function isWeightedTargetNode(
    node: Pick<PlanNode, "level" | "period_target">,
    rule?: PlanRule | null
): boolean {
    if (rule && !stepRequiresWeight(rule, node.level)) {
        return false;
    }
    return Number(node.period_target) > 0;
}

export function isAchievementLeaf(node: Pick<PlanNode, "children">): boolean {
    return !hasActiveChildNodes(node);
}

export function resolveAchievementEntryMode(
    node: Pick<PlanNode, "level" | "period_target" | "children" | "period_actual_override">,
    rule?: PlanRule | null
): AchievementEntryMode {
    if (!isWeightedTargetNode(node, rule)) {
        return "rollup";
    }
    if (node.period_actual_override) {
        return "parent_override";
    }
    return isAchievementLeaf(node) ? "leaf" : "rollup";
}

export function canManuallyEnterAchievement(
    node: Pick<PlanNode, "level" | "period_target" | "children" | "period_actual_override">,
    rule?: PlanRule | null
): boolean {
    const mode = resolveAchievementEntryMode(node, rule);
    return mode === "leaf" || mode === "parent_override";
}

export function canEditNodePeriodActual(
    node: Pick<PlanNode, "level" | "period_target" | "children" | "period_actual_override">,
    rule: PlanRule | null | undefined,
    periodOpenForEntry: boolean
): boolean {
    if (!periodOpenForEntry) {
        return false;
    }
    return canManuallyEnterAchievement(node, rule);
}
