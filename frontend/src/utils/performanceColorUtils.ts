import { PerformanceColorThreshold } from "@/redux/types/performanceColorThreshold";

export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceColorThreshold[] = [
  { performance_color_threshold_id: "default-0", label: "No Performance", min_percentage: 0, max_percentage: 0, color_hex: "#DC2626", sort_order: 1, is_active: true },
  { performance_color_threshold_id: "default-1", label: "Very Poor", min_percentage: 1, max_percentage: 24, color_hex: "#EF4444", sort_order: 2, is_active: true },
  { performance_color_threshold_id: "default-2", label: "Poor", min_percentage: 25, max_percentage: 49, color_hex: "#F97316", sort_order: 3, is_active: true },
  { performance_color_threshold_id: "default-3", label: "Average", min_percentage: 50, max_percentage: 69, color_hex: "#EAB308", sort_order: 4, is_active: true },
  { performance_color_threshold_id: "default-4", label: "Good", min_percentage: 70, max_percentage: 84, color_hex: "#22C55E", sort_order: 5, is_active: true },
  { performance_color_threshold_id: "default-5", label: "Very Good", min_percentage: 85, max_percentage: 99, color_hex: "#16A34A", sort_order: 6, is_active: true },
  { performance_color_threshold_id: "default-6", label: "Completed", min_percentage: 100, max_percentage: 100, color_hex: "#15803D", sort_order: 7, is_active: true },
];

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

/** Stable demo completion % per node (0–100) until real progress is wired up. */
export function getDemoCompletionPercent(nodeId: string): number {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash << 5) - hash + nodeId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 101;
}

export function formatPercentageRange(threshold: PerformanceColorThreshold): string {
  if (threshold.min_percentage === threshold.max_percentage) {
    return `${threshold.min_percentage}%`;
  }
  return `${threshold.min_percentage}–${threshold.max_percentage}%`;
}
