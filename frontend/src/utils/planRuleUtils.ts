import {
    PlanRule,
    PlanRuleStep,
    PlanNode,
    PlanRuleWeightMode,
} from "@/redux/types/plan";

export const WEIGHT_MODE_LABELS: Record<PlanRuleWeightMode, string> = {
    number: "Number (points)",
    percentage: "Percentage (%)",
    frequency: "Frequency (times)",
};

export function getWeightUnitLabel(weightMode?: PlanRuleWeightMode | null): string {
    switch (weightMode) {
        case "percentage":
            return "%";
        case "frequency":
            return "times";
        default:
            return "pts";
    }
}

export function sortSteps(steps: PlanRuleStep[]): PlanRuleStep[] {
    return [...steps].sort((a, b) => a.step_order - b.step_order);
}

export function getWeightStartLevel(rule?: PlanRule | null): number | null {
    if (!rule?.steps?.length) return null;
    const sorted = sortSteps(rule.steps);
    const startStep = sorted.find((s) => s.requires_weight);
    return startStep?.step_order ?? null;
}

export function stepRequiresWeight(rule: PlanRule | null | undefined, level: number): boolean {
    const start = getWeightStartLevel(rule);
    return start !== null && level >= start;
}

export function isWeightModeSelectionLevel(rule: PlanRule | null | undefined, level: number): boolean {
    return getWeightStartLevel(rule) === level;
}

export function resolveNodeWeightMode(
    rule: PlanRule | null | undefined,
    level: number,
    parent?: PlanNode | null,
    node?: PlanNode | null
): PlanRuleWeightMode | null {
    if (!stepRequiresWeight(rule, level)) return null;
    if (isWeightModeSelectionLevel(rule, level)) {
        return node?.weight_mode ?? null;
    }
    return parent?.weight_mode ?? node?.weight_mode ?? null;
}

export function getMaxRuleDepth(rule?: PlanRule | null): number {
    if (!rule?.steps?.length) return 4;
    return Math.max(...rule.steps.map((s) => s.step_order));
}

export function getStepForLevel(rule: PlanRule | null | undefined, level: number): PlanRuleStep | null {
    if (!rule?.steps?.length) return null;
    return rule.steps.find((s) => s.step_order === level) ?? null;
}

export function getStepLabel(rule: PlanRule | null | undefined, level: number): string {
    return getStepForLevel(rule, level)?.label ?? `Level ${level}`;
}

export function getChildStepForParent(
    rule: PlanRule | null | undefined,
    parent: PlanNode | null | undefined
): PlanRuleStep | null {
    const parentLevel = parent ? parent.level : 0;
    return getStepForLevel(rule, parentLevel + 1);
}

export function getWeightTarget(
    parent: PlanNode | null | undefined,
    weightMode: PlanRuleWeightMode | null | undefined
): number | null {
    if (parent && parent.weight > 0) return parent.weight;
    if (weightMode === "percentage") return 100;
    return null;
}

export function canAddChild(
    rule: PlanRule | null | undefined,
    parent: PlanNode | null | undefined
): boolean {
    const childLevel = parent ? parent.level + 1 : 1;
    return childLevel <= getMaxRuleDepth(rule);
}

export function formatNodeWeight(weight: number, weightMode?: PlanRuleWeightMode | null): string {
    if (weight <= 0) return "";
    const unit = getWeightUnitLabel(weightMode);
    return `${weight}${unit}`;
}

export function levelToNodeType(level: number): PlanNode["type"] {
    const map: Record<number, PlanNode["type"]> = {
        1: "strategic",
        2: "goal",
        3: "kpi",
        4: "task",
    };
    return map[level] ?? "task";
}
