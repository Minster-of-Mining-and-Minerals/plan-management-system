import { PerformanceColorThreshold } from "@/redux/types/performanceColorThreshold";
import { PlanNodeHierarchy } from "@/redux/types/plan";

export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceColorThreshold[] = [
  { performance_color_threshold_id: "default-0", label: "No Performance", min_percentage: 0, max_percentage: 0, color_hex: "#DC2626", sort_order: 1, is_active: true },
  { performance_color_threshold_id: "default-1", label: "Very Poor", min_percentage: 1, max_percentage: 24, color_hex: "#EF4444", sort_order: 2, is_active: true },
  { performance_color_threshold_id: "default-2", label: "Poor", min_percentage: 25, max_percentage: 49, color_hex: "#F97316", sort_order: 3, is_active: true },
  { performance_color_threshold_id: "default-3", label: "Average", min_percentage: 50, max_percentage: 69, color_hex: "#EAB308", sort_order: 4, is_active: true },
  { performance_color_threshold_id: "default-4", label: "Good", min_percentage: 70, max_percentage: 84, color_hex: "#22C55E", sort_order: 5, is_active: true },
  { performance_color_threshold_id: "default-5", label: "Very Good", min_percentage: 85, max_percentage: 99, color_hex: "#16A34A", sort_order: 6, is_active: true },
  { performance_color_threshold_id: "default-6", label: "Completed", min_percentage: 100, max_percentage: 100, color_hex: "#15803D", sort_order: 7, is_active: true },
];

export const LOCKED_STATUS_COLOR = "#9CA3AF";
export const NEUTRAL_PLANNING_COLOR = "#9CA3AF";

export interface CompletionAppearance {
  percent: number;
  color: string;
  label: string;
}

export interface ProgressAppearance extends CompletionAppearance {
  /** False during planning or before any achievement is recorded. */
  visible: boolean;
}

export interface AchievementProgressContext {
  processStarted: boolean;
  hasRecordedActuals: boolean;
}

export function sortPerformanceThresholds(
  thresholds: PerformanceColorThreshold[]
): PerformanceColorThreshold[] {
  return thresholds
    .slice()
    .sort((a, b) => {
      const orderDiff = a.sort_order - b.sort_order;
      if (orderDiff !== 0) return orderDiff;
      return a.min_percentage - b.min_percentage;
    });
}

export function resolveThresholdForPercentage(
  thresholds: PerformanceColorThreshold[],
  percentage: number,
  activeOnly = true
): PerformanceColorThreshold | null {
  const value = Math.max(0, Math.min(100, Math.round(percentage)));
  const list = sortPerformanceThresholds(
    activeOnly ? thresholds.filter((t) => t.is_active) : thresholds
  );

  for (const threshold of list) {
    if (value >= threshold.min_percentage && value <= threshold.max_percentage) {
      return threshold;
    }
  }

  return list[list.length - 1] ?? null;
}

export function resolveColorForPercentage(
  thresholds: PerformanceColorThreshold[],
  percentage: number
): string {
  return resolveThresholdForPercentage(thresholds, percentage)?.color_hex ?? "#6B7280";
}

export function formatPercentageRange(threshold: PerformanceColorThreshold): string {
  if (threshold.min_percentage === threshold.max_percentage) {
    return `${threshold.min_percentage}%`;
  }
  return `${threshold.min_percentage}–${threshold.max_percentage}%`;
}

export function resolveCompletionAppearance(
  thresholds: PerformanceColorThreshold[],
  percentage: number
): CompletionAppearance {
  const percent = Math.max(0, Math.min(100, Math.round(percentage)));
  const match = resolveThresholdForPercentage(thresholds, percent);
  return {
    percent,
    color: match?.color_hex ?? resolveColorForPercentage(thresholds, percent),
    label: match?.label ?? "",
  };
}

export function hiddenProgressAppearance(): ProgressAppearance {
  return {
    percent: 0,
    color: NEUTRAL_PLANNING_COLOR,
    label: "",
    visible: false,
  };
}

export function versionHasRecordedActuals(version: {
  execution_has_recorded_actuals?: boolean;
  execution_actuals_readiness?: { recorded_count?: number } | null;
}): boolean {
  if (version.execution_has_recorded_actuals === true) {
    return true;
  }
  return (version.execution_actuals_readiness?.recorded_count ?? 0) > 0;
}

export function shouldShowAchievementProgress(
  processStarted: boolean,
  hasRecordedActuals: boolean
): boolean {
  return processStarted && hasRecordedActuals;
}

export function treeHasRecordedActual(nodes: PlanNodeHierarchy[]): boolean {
  for (const node of nodes) {
    if (node.period_actual != null) {
      return true;
    }
    if (node.children?.length && treeHasRecordedActual(node.children)) {
      return true;
    }
  }
  return false;
}

export function resolveCompletionForVersion(
  thresholds: PerformanceColorThreshold[],
  version: {
    plan_version_id: string;
    execution_progress_percent?: number | null;
    execution_status?: string | null;
    status?: string | null;
    execution_has_recorded_actuals?: boolean;
    execution_actuals_readiness?: { recorded_count?: number } | null;
  },
  processStarted: boolean,
  hasRecordedActuals?: boolean
): ProgressAppearance {
  const recorded =
    hasRecordedActuals ?? versionHasRecordedActuals(version);

  if (
    processStarted &&
    (version.execution_status === "completed" || version.status === "completed")
  ) {
    return {
      ...resolveCompletionAppearance(thresholds, 100),
      visible: true,
    };
  }

  if (!shouldShowAchievementProgress(processStarted, recorded)) {
    return hiddenProgressAppearance();
  }

  if (version.execution_progress_percent != null) {
    return {
      ...resolveCompletionAppearance(thresholds, version.execution_progress_percent),
      visible: true,
    };
  }

  return hiddenProgressAppearance();
}

export function resolveCompletionForPlanNode(
  thresholds: PerformanceColorThreshold[],
  node: {
    plan_node_id: string;
    period_target?: number | null;
    period_actual?: number | null;
    period_actual_override?: boolean;
    execution_progress_percent?: number | null;
    computed_period_actual?: number | null;
    computed_period_target?: number | null;
    children?: PlanNodeHierarchy[];
  },
  processStarted: boolean,
  periodHasRecordedActuals: boolean
): ProgressAppearance {
  if (!shouldShowAchievementProgress(processStarted, periodHasRecordedActuals)) {
    return hiddenProgressAppearance();
  }

  const hasChildren = (node.children ?? []).some((child) => child.is_active !== false);
  const isManualLeaf =
    !hasChildren && !node.period_actual_override && node.period_actual == null;

  if (isManualLeaf) {
    return hiddenProgressAppearance();
  }

  if (node.execution_progress_percent != null) {
    return {
      ...resolveCompletionAppearance(thresholds, node.execution_progress_percent),
      visible: true,
    };
  }

  const target =
    Number(node.computed_period_target) || Number(node.period_target) || 0;
  if (target > 0 && node.period_actual != null) {
    return {
      ...resolveCompletionAppearance(
        thresholds,
        (Number(node.period_actual) / target) * 100
      ),
      visible: true,
    };
  }

  return hiddenProgressAppearance();
}

/** Workflow badge only — no performance coloring until achievements exist. */
export function resolveWorkflowStatusAppearance(
  thresholds: PerformanceColorThreshold[],
  options: {
    status: string;
    isLocked?: boolean;
    progress?: ProgressAppearance;
    statusLabel?: string;
    useAchievementColors?: boolean;
  }
): CompletionAppearance {
  const { status, isLocked, progress, statusLabel, useAchievementColors = false } =
    options;

  if (isLocked || status === "locked") {
    return {
      percent: 0,
      color: LOCKED_STATUS_COLOR,
      label: statusLabel ?? "Locked",
    };
  }

  if (status === "completed") {
    if (useAchievementColors && progress?.visible) {
      const completed = resolveCompletionAppearance(thresholds, 100);
      return { ...completed, label: statusLabel ?? completed.label };
    }
    return {
      percent: 0,
      color: NEUTRAL_PLANNING_COLOR,
      label: statusLabel ?? "Completed",
    };
  }

  if (useAchievementColors && progress?.visible) {
    const active = resolveCompletionAppearance(thresholds, progress.percent);
    return { ...active, label: statusLabel ?? active.label };
  }

  return {
    percent: 0,
    color: NEUTRAL_PLANNING_COLOR,
    label: statusLabel ?? "",
  };
}
