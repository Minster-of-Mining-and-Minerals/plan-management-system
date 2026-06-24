"use client";

import { useMemo } from "react";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";
import {
  DEFAULT_PLANNING_CONFIGURATION,
  type PlanningConfiguration,
} from "@/redux/types/planningConfig";
import { useStructureScope } from "@/hooks/useStructureScope";

type UseEffectivePlanningConfigurationOptions = {
  governmentStructureId?: string | null;
  skip?: boolean;
};

export function useEffectivePlanningConfiguration(
  options: UseEffectivePlanningConfigurationOptions = {}
) {
  const { structureId: sessionStructureId } = useStructureScope();
  const targetStructureId =
    options.governmentStructureId ?? sessionStructureId ?? undefined;

  const queryArg = useMemo(
    () =>
      targetStructureId
        ? { government_structure_id: targetStructureId }
        : undefined,
    [targetStructureId]
  );

  const result = useGetPlanningConfigurationQuery(queryArg, {
    skip: options.skip ?? false,
  });

  const config: PlanningConfiguration =
    result.data ?? DEFAULT_PLANNING_CONFIGURATION;

  return {
    ...result,
    config,
    targetStructureId,
  };
}
