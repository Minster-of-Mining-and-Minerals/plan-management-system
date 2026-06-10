import { useMemo } from "react";
import { useGetPerformanceColorThresholdsQuery } from "@/redux/api/performanceColorThresholdApi";
import { PerformanceColorThreshold } from "@/redux/types/performanceColorThreshold";
import { DEFAULT_PERFORMANCE_THRESHOLDS } from "@/utils/performanceColorUtils";

export function usePerformanceColorThresholds(): PerformanceColorThreshold[] {
  const { data: thresholdsRaw = [] } = useGetPerformanceColorThresholdsQuery({
    is_active: true,
  });

  return useMemo(
    () => (thresholdsRaw.length > 0 ? thresholdsRaw : DEFAULT_PERFORMANCE_THRESHOLDS),
    [thresholdsRaw]
  );
}
