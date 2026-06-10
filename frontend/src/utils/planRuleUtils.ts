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
