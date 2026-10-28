import type { CSSProperties } from "react";
import {
    PlanRule,
    PlanRuleStep,
    PlanNode,
    PlanRuleWeightMode,
} from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { resolveTargetUnitSymbol } from "@/redux/types/planningConfig";

/** User-facing label for the plan node weight field */
export const TARGET_FIELD_LABEL = "Target";

/** User-facing label for execution rollup contribution weight */
export const CONTRIBUTION_FIELD_LABEL = "Contribution";

export const WEIGHT_MODE_LABELS: Record<PlanRuleWeightMode, string> = {
    number: "Number",
    percentage: "Percentage (%)",
    frequency: "Frequency (times)",
};

export function getWeightUnitLabel(
    weightMode?: PlanRuleWeightMode | null,
    targetUnit?: string | null,
    configuredUnits?: TargetUnit[]
): string {
    switch (weightMode) {
        case "percentage":
            return "%";
        case "frequency":
            return " times";
        case "number":
            if (targetUnit) {
                const symbol = resolveTargetUnitSymbol(configuredUnits, targetUnit);
                return symbol ? ` ${symbol}` : "";
            }
            return "";
        default:
            return "";
    }
}

export function resolveNodeTargetUnit(
    rule: PlanRule | null | undefined,
    level: number,
    parent?: PlanNode | null,
    node?: PlanNode | null
): string | null {
    if (!stepRequiresWeight(rule, level)) return null;
    if (isWeightModeSelectionLevel(rule, level)) {
        return node?.target_unit ?? null;
    }
    return parent?.target_unit ?? node?.target_unit ?? null;
}

export function sortSteps(steps: PlanRuleStep[]): PlanRuleStep[] {
    return [...steps].sort((a, b) => ((a.step_order ?? (a as any).level ?? 0) - (b.step_order ?? (b as any).level ?? 0)));
}

export function getWeightStartLevel(rule?: PlanRule | any | null): number | null {
    if (!rule?.steps?.length) return null;
    const sorted = sortSteps(rule.steps);
    const startStep = sorted.find((s) => s.requires_weight);
    return startStep?.step_order ?? (startStep as any)?.level ?? null;
}

export function stepRequiresWeight(rule: PlanRule | any | null | undefined, level: number): boolean {
    const start = getWeightStartLevel(rule);
    return start !== null && level >= start;
}

export function stepRequiresContributionWeight(
    rule: PlanRule | any | null | undefined,
    level: number
): boolean {
    return Boolean(getStepForLevel(rule, level)?.requires_contribution_weight);
}

export function getContributionSiblingTarget(): number {
    return 100;
}

export function isWeightModeSelectionLevel(rule: PlanRule | any | null | undefined, level: number): boolean {
    return getWeightStartLevel(rule) === level;
}

export function resolveNodeWeightMode(
    rule: PlanRule | any | null | undefined,
    level: number,
    parent?: PlanNode | any | null,
    node?: PlanNode | any | null
): PlanRuleWeightMode | null {
    if (!stepRequiresWeight(rule, level)) return null;
    if (isWeightModeSelectionLevel(rule, level)) {
        return node?.weight_mode ?? null;
    }
    return parent?.weight_mode ?? node?.weight_mode ?? null;
}

export function getMaxRuleDepth(rule?: PlanRule | any | null): number {
    if (!rule?.steps?.length) return 4;
    return Math.max(...rule.steps.map((s: any) => s.step_order ?? s.level ?? 1));
}

export function getStepForLevel(rule: PlanRule | any | null | undefined, level: number): PlanRuleStep | any | null {
    if (!rule?.steps?.length) return null;
    return rule.steps.find((s: any) => (s.step_order ?? s.level) === level) ?? null;
}

export function getStepLabel(rule: PlanRule | any | null | undefined, level: number): string {
    const step = getStepForLevel(rule, level);
    return step?.label ?? step?.name ?? `Level ${level}`;
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

export function getAmendableTargetLevel(rule?: PlanRule | null): number | null {
    if (!rule?.steps?.length) return null;
    const weightLevel = getWeightStartLevel(rule);
    if (weightLevel != null) return weightLevel;
    if (getStepForLevel(rule, 3)) return 3;
    return null;
}

export function getAmendableTargetLabel(rule?: PlanRule | null): string {
    const level = getAmendableTargetLevel(rule);
    if (level == null) return "Target node";
    return getStepLabel(rule, level);
}

export function isAmendableTargetNode(
    node: { level?: number; type?: string },
    rule?: PlanRule | null
): boolean {
    const level = getAmendableTargetLevel(rule);
    if (level != null && node.level != null) {
        return node.level === level;
    }
    return node.type === "kpi";
}

export function formatNodeWeight(
    weight: number,
    weightMode?: PlanRuleWeightMode | null,
    targetUnit?: string | null,
    configuredUnits?: TargetUnit[]
): string {
    if (weight <= 0) return "";
    const unit = getWeightUnitLabel(weightMode, targetUnit, configuredUnits);
    if (weightMode === "number" && unit) {
        return `${weight}${unit}`;
    }
    if (weightMode === "percentage") {
        return `${weight}%`;
    }
    if (weightMode === "frequency") {
        return `${weight} times`;
    }
    return `${weight}${unit}`;
}

export function formatNodeTarget(
    weight: number,
    weightMode?: PlanRuleWeightMode | null,
    targetUnit?: string | null,
    configuredUnits?: TargetUnit[]
): string {
    const value = formatNodeWeight(weight, weightMode, targetUnit, configuredUnits);
    if (!value) return "";
    return `${TARGET_FIELD_LABEL}: ${value}`;
}

export function formatNodeContribution(contributionWeight?: number | null): string {
    const value = Number(contributionWeight) || 0;
    if (value <= 0) return "";
    return `${CONTRIBUTION_FIELD_LABEL}: ${value}%`;
}

export interface ContributionAllocation {
    target: number;
    allocated: number;
    remaining: number;
    isComplete: boolean;
    childCount: number;
    missingCount: number;
}

export function computeContributionAllocation(
    children: Array<Pick<PlanNode, "contribution_weight" | "is_active">>,
    target = 100
): ContributionAllocation {
    const activeChildren = children.filter((child) => child.is_active !== false);
    const allocated = activeChildren.reduce(
        (sum, child) => sum + (Number(child.contribution_weight) || 0),
        0
    );
    const missingCount = activeChildren.filter(
        (child) => !child.contribution_weight || child.contribution_weight <= 0
    ).length;

    return {
        target,
        allocated,
        remaining: Math.max(0, target - allocated),
        isComplete: Math.abs(allocated - target) <= 0.001 && missingCount === 0,
        childCount: activeChildren.length,
        missingCount,
    };
}

export function computeEqualContributionWeights(childCount: number, target = 100): number[] {
    if (childCount <= 0) return [];
    if (childCount === 1) return [target];

    const base = Math.floor((target / childCount) * 100) / 100;
    const weights = Array.from({ length: childCount }, () => base);
    const allocatedExceptLast = base * (childCount - 1);
    weights[childCount - 1] = Math.round((target - allocatedExceptLast) * 1000) / 1000;
    return weights;
}

export function childLevelRequiresContribution(
    rule: PlanRule | null | undefined,
    children?: Array<Pick<PlanNode, "level">> | null
): boolean {
    const childLevel = children?.[0]?.level;
    return childLevel != null && stepRequiresContributionWeight(rule, childLevel);
}

export interface ContributionAllocationIssue {
    parentId: string;
    parentTitle: string;
    sum: number;
    childCount: number;
    missingCount: number;
}

export function findContributionAllocationIssues(
    nodes: PlanNode[],
    rule: PlanRule | null | undefined
): ContributionAllocationIssue[] {
    if (!rule) return [];

    const activeNodes = nodes.filter((node) => node.is_active);
    const issues: ContributionAllocationIssue[] = [];

    for (const parent of activeNodes) {
        const children = activeNodes.filter((child) => child.parent_id === parent.plan_node_id);
        if (children.length === 0) continue;
        if (!stepRequiresContributionWeight(rule, children[0].level)) continue;

        const allocation = computeContributionAllocation(children);
        if (!allocation.isComplete) {
            issues.push({
                parentId: parent.plan_node_id,
                parentTitle: parent.title,
                sum: allocation.allocated,
                childCount: allocation.childCount,
                missingCount: allocation.missingCount,
            });
        }
    }

    return issues;
}

export function describeParentRollupMethod(
    rule: PlanRule | null | undefined,
    childLevel: number
): "weighted" | "equal" {
    return stepRequiresContributionWeight(rule, childLevel) ? "weighted" : "equal";
}

export function buildRollupTooltipLines(
    rule: PlanRule | null | undefined,
    node: Pick<PlanNode, "title">,
    children: PlanNode[]
): string[] {
    if (!children.length) return [];

    const childLevel = children[0].level;
    const method = describeParentRollupMethod(rule, childLevel);

    if (method === "equal") {
        return [
            `${node.title} uses an equal average of evaluable children.`,
            "Each child with a period target counts equally toward this score.",
        ];
    }

    const lines = [
        `${node.title} uses a weighted average of evaluable children.`,
        "Formula: sum(child % x contribution) / sum(contribution).",
    ];

    for (const child of children) {
        const contribution = Number(child.contribution_weight) || 0;
        const percent = child.execution_progress_percent;
        const evaluable = child.is_evaluable !== false && (Number(child.period_target) || 0) > 0;
        const percentLabel = percent != null ? `${percent}%` : "n/a";
        lines.push(
            `- ${child.title}: ${percentLabel}${contribution > 0 ? ` (contrib ${contribution}%)` : ""}${evaluable ? "" : " — excluded (no target)"}`
        );
    }

    lines.push("Only evaluable children participate; weights renormalize among them.");
    return lines;
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

export const DEFAULT_PLAN_STEP_COLORS = [
    "#7C3AED",
    "#2563EB",
    "#059669",
    "#D97706",
    "#DB2777",
    "#0891B2",
] as const;

export function hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace("#", "").trim();
    if (normalized.length !== 6) {
        return `rgba(107, 114, 128, ${alpha})`;
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getStepColorHex(
    rule: PlanRule | null | undefined,
    level: number
): string {
    const step = getStepForLevel(rule, level);
    if (step?.color_hex) {
        return step.color_hex;
    }

    return DEFAULT_PLAN_STEP_COLORS[
        (Math.max(level, 1) - 1) % DEFAULT_PLAN_STEP_COLORS.length
    ];
}

export function getDefaultStepColorHex(level: number): string {
    return DEFAULT_PLAN_STEP_COLORS[
        (Math.max(level, 1) - 1) % DEFAULT_PLAN_STEP_COLORS.length
    ];
}

export function getPlanStepSurfaceStyles(colorHex: string): CSSProperties {
    return {
        backgroundColor: hexToRgba(colorHex, 0.055),
        borderLeft: `3px solid ${hexToRgba(colorHex, 0.32)}`,
    };
}
