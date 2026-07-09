"use client";

import { useMemo } from "react";
import { useGetPlanningConfigurationForVersionQuery } from "@/redux/api/planningConfigApi";
import {
  DEFAULT_PLANNING_CONFIGURATION,
  type PlanningConfiguration,
} from "@/redux/types/planningConfig";
import type { PlanVersion } from "@/redux/types/plan";

function resolveMasterVersionId(
  version?: PlanVersion | null,
  masterVersion?: PlanVersion | null
): string | undefined {
  if (!version) return undefined;

  if (version.version_kind === "master") {
    return version.plan_version_id;
  }

  return masterVersion?.plan_version_id ?? version.parent_plan_version_id ?? undefined;
}

export function usePlanVersionPlanningConfiguration(
  version?: PlanVersion | null,
  masterVersion?: PlanVersion | null
) {
  const versionIdForConfig = useMemo(
    () => resolveMasterVersionId(version, masterVersion),
    [version, masterVersion]
  );

  const result = useGetPlanningConfigurationForVersionQuery(versionIdForConfig!, {
    skip: !versionIdForConfig,
  });

  const config: PlanningConfiguration =
    result.data ?? DEFAULT_PLANNING_CONFIGURATION;

  return {
    ...result,
    config,
    versionIdForConfig,
  };
}
