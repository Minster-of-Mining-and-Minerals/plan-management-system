"use client";

import type { PlanVersion } from "@/redux/types/plan";
import type { PlanningConfiguration } from "@/redux/types/planningConfig";
import { DEFAULT_PLANNING_CONFIGURATION } from "@/redux/types/planningConfig";
import {
  formatDurationYears,
  formatPlanningPeriod,
  getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";

interface PlanDraftHeaderMetaProps {
  version?: PlanVersion | null;
  config?: PlanningConfiguration | null;
  showSector?: boolean;
  /** When true, renders as subtitle text instead of a page title */
  compact?: boolean;
}

export function PlanDraftHeaderMeta({
  version,
  config = DEFAULT_PLANNING_CONFIGURATION,
  showSector = true,
  compact = false,
}: PlanDraftHeaderMetaProps) {
  if (!version) return null;

  const labels = config ?? DEFAULT_PLANNING_CONFIGURATION;
  const period =
    version.start_year != null && version.end_year != null
      ? formatPlanningPeriod(version)
      : null;
  const duration =
    version.planning_duration_years != null
      ? formatDurationYears(version.planning_duration_years)
      : null;

  const titleClass = compact
    ? "text-sm font-medium text-gray-700"
    : "text-2xl font-bold text-gray-900";

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <p className={titleClass}>{getPlanDraftDisplayName(version)}</p>
      <div className={`flex flex-col gap-0.5 text-sm text-gray-500 ${compact ? "text-xs" : ""}`}>
        {period && (
          <p>
            <span className="font-medium text-gray-600">{labels.planning_period_label}:</span>{" "}
            {period}
          </p>
        )}
        {duration && (
          <p>
            <span className="font-medium text-gray-600">{labels.duration_label}:</span> {duration}
          </p>
        )}
        {showSector && (
          <p className="text-gray-500">{version.governmentStructure?.name || "Global Sector"}</p>
        )}
      </div>
    </div>
  );
}
