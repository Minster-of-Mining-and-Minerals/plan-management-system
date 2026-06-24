"use client";

import type { PlanVersion } from "@/redux/types/plan";
import { useEffectivePlanningConfiguration } from "@/hooks/useEffectivePlanningConfiguration";

function resolvePlanningStructureId(
  version?: PlanVersion | null,
  masterVersion?: PlanVersion | null
): string | undefined {
  if (!version) return undefined;

  if (version.version_kind === "master") {
    return version.government_structure_id;
  }

  return masterVersion?.government_structure_id ?? version.government_structure_id;
}

export function usePlanVersionPlanningConfiguration(
  version?: PlanVersion | null,
  masterVersion?: PlanVersion | null
) {
  const governmentStructureId = resolvePlanningStructureId(version, masterVersion);

  return useEffectivePlanningConfiguration({
    governmentStructureId,
    skip: !governmentStructureId,
  });
}
