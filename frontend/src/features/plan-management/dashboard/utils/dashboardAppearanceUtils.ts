import type { BrandingSettings } from "@/redux/types/branding";
import type { PerformanceColorThreshold } from "@/redux/types/performanceColorThreshold";
import type { PerformanceLevel } from "../types";
import {
  resolveColorForPercentage,
  resolveCompletionAppearance,
  resolveThresholdForPercentage,
} from "@/utils/performanceColorUtils";

export type BrandingTone =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

export const PERFORMANCE_LEVEL_PERCENT: Record<PerformanceLevel, number> = {
  excellent: 92,
  good: 77,
  average: 60,
  "at-risk": 20,
};

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getBrandingColor(
  branding: BrandingSettings,
  tone: BrandingTone
): string {
  const map: Record<BrandingTone, string> = {
    primary: branding.primary_color,
    secondary: branding.secondary_color,
    accent: branding.accent_color,
    info: branding.info_color,
    success: branding.success_color,
    warning: branding.warning_color,
    error: branding.error_color,
  };
  return map[tone];
}

export function getBrandingChartPalette(branding: BrandingSettings): string[] {
  return [
    branding.primary_color,
    branding.accent_color,
    branding.info_color,
    branding.secondary_color,
    branding.success_color,
    branding.warning_color,
  ];
}

export function getBrandingToneStyles(
  branding: BrandingSettings,
  tone: BrandingTone
) {
  const color = getBrandingColor(branding, tone);
  return {
    color,
    gradientBackground: `linear-gradient(135deg, ${hexToRgba(color, 0.14)} 0%, ${hexToRgba(color, 0.04)} 45%, #ffffff 100%)`,
    borderColor: hexToRgba(color, 0.22),
    iconBackground: hexToRgba(color, 0.12),
    iconColor: color,
    solidBackground: color,
    solidText: "#ffffff",
    mutedText: branding.text_secondary_color,
    valueText: branding.text_primary_color,
  };
}

export function resolveDashboardPerformanceAppearance(
  thresholds: PerformanceColorThreshold[],
  percentage: number | null | undefined
) {
  if (percentage == null || Number.isNaN(percentage)) {
    return {
      percent: 0,
      color: getNeutralPerformanceColor(),
      label: "",
    };
  }
  return resolveCompletionAppearance(thresholds, percentage);
}

export function resolveDashboardPerformanceColor(
  thresholds: PerformanceColorThreshold[],
  percentage: number | null | undefined
): string {
  if (percentage == null || Number.isNaN(percentage)) {
    return getNeutralPerformanceColor();
  }
  return resolveColorForPercentage(thresholds, percentage);
}

export function resolvePerformanceLevelColor(
  thresholds: PerformanceColorThreshold[],
  level: PerformanceLevel,
  percentage?: number | null
): string {
  if (percentage != null && !Number.isNaN(percentage)) {
    return resolveColorForPercentage(thresholds, percentage);
  }
  return resolveColorForPercentage(thresholds, PERFORMANCE_LEVEL_PERCENT[level]);
}

export function resolvePerformanceLevelLabel(
  thresholds: PerformanceColorThreshold[],
  level: PerformanceLevel,
  percentage?: number | null
): string {
  const percent =
    percentage != null && !Number.isNaN(percentage)
      ? Math.round(percentage)
      : PERFORMANCE_LEVEL_PERCENT[level];
  return resolveThresholdForPercentage(thresholds, percent)?.label ?? level;
}

export function getNeutralPerformanceColor(): string {
  return "hsl(var(--muted-foreground))";
}
