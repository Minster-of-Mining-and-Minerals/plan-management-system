"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useGetPeriodTargetReallocationReportingQuery } from "@/redux/api/planApi";
import type { PeriodTargetReallocationReportingItem } from "@/redux/types/plan";

type PeriodTargetReallocationReportingValue = {
  bySnapshotNodeId: Map<string, PeriodTargetReallocationReportingItem>;
  isLoading: boolean;
  isReady: boolean;
};

const defaultValue: PeriodTargetReallocationReportingValue = {
  bySnapshotNodeId: new Map(),
  isLoading: false,
  isReady: false,
};

const PeriodTargetReallocationReportingContext =
  createContext<PeriodTargetReallocationReportingValue>(defaultValue);

export function PeriodTargetReallocationReportingProvider({
  versionId,
  enabled = true,
  children,
}: {
  versionId: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const { data, isLoading, isFetching } = useGetPeriodTargetReallocationReportingQuery(
    { versionId },
    { skip: !enabled || !versionId }
  );

  const value = useMemo<PeriodTargetReallocationReportingValue>(() => {
    if (!enabled) {
      return defaultValue;
    }

    const bySnapshotNodeId = new Map<string, PeriodTargetReallocationReportingItem>();
    for (const item of data?.items ?? []) {
      if (item.snapshot_period_plan_node_id) {
        bySnapshotNodeId.set(item.snapshot_period_plan_node_id, item);
      }
    }

    return {
      bySnapshotNodeId,
      isLoading: isLoading || isFetching,
      isReady: !isLoading,
    };
  }, [data?.items, enabled, isFetching, isLoading]);

  return (
    <PeriodTargetReallocationReportingContext.Provider value={value}>
      {children}
    </PeriodTargetReallocationReportingContext.Provider>
  );
}

export function usePeriodTargetReallocationReporting() {
  return useContext(PeriodTargetReallocationReportingContext);
}

export function usePeriodTargetReallocationForNode(planNodeId: string | null | undefined) {
  const { bySnapshotNodeId, isLoading, isReady } = usePeriodTargetReallocationReporting();
  const item = planNodeId ? bySnapshotNodeId.get(planNodeId) ?? null : null;
  return { item, isLoading, isReady };
}
