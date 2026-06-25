"use client";

import { useMemo } from "react";
import { useBranding } from "@/providers/BrandingProvider";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import type { PerformanceLevel } from "../types";
import {
  getBrandingChartPalette,
  getBrandingColor,
  getBrandingToneStyles,
  resolveDashboardPerformanceAppearance,
  resolveDashboardPerformanceColor,
  resolvePerformanceLevelColor,
  resolvePerformanceLevelLabel,
  type BrandingTone,
} from "../utils/dashboardAppearanceUtils";

export function useDashboardAppearance() {
  const { branding } = useBranding();
  const thresholds = usePerformanceColorThresholds();

  return useMemo(
    () => ({
      branding,
      thresholds,
      textPrimary: branding.text_primary_color,
      textSecondary: branding.text_secondary_color,
      border: branding.border_color,
      surface: branding.surface_color,
      chartPalette: getBrandingChartPalette(branding),
      color: (tone: BrandingTone) => getBrandingColor(branding, tone),
      tone: (tone: BrandingTone) => getBrandingToneStyles(branding, tone),
      performanceColor: (percent: number | null | undefined) =>
        resolveDashboardPerformanceColor(thresholds, percent),
      performanceAppearance: (percent: number | null | undefined) =>
        resolveDashboardPerformanceAppearance(thresholds, percent),
      performanceLevelColor: (
        level: PerformanceLevel,
        percent?: number | null
      ) => resolvePerformanceLevelColor(thresholds, level, percent),
      performanceLevelLabel: (
        level: PerformanceLevel,
        percent?: number | null
      ) => resolvePerformanceLevelLabel(thresholds, level, percent),
    }),
    [branding, thresholds]
  );
}
