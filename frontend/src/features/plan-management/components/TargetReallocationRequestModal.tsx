"use client";

import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DIALOG_SCROLLABLE_BODY,
  DIALOG_SCROLLABLE_CONTENT,
} from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import {
  useGetExecutionPeriodsQuery,
  useGetPlanHierarchyQuery,
  useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import type { PlanNodeHierarchy, PlanVersion } from "@/redux/types/plan";
import { flattenPlanHierarchy } from "@/utils/planAchievementHierarchyUtils";
import { TargetReallocationRequestForm } from "./TargetReallocationRequestForm";

type TargetReallocationRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId: string;
  annualVersionId: string;
};

function resolveLiveVersionId(
  version: PlanVersion | null | undefined,
  fallbackId: string
): string {
  return version?.execution_snapshot_of_version_id || fallbackId;
}

function toLivePeriodOptions(periods: PlanVersion[]): PlanVersion[] {
  return periods.map((period) => ({
    ...period,
    plan_version_id:
      period.execution_snapshot_of_version_id || period.plan_version_id,
  }));
}

function collectAnnualKpiOptions(
  nodes: PlanNodeHierarchy[]
): Array<{ id: string; title: string }> {
  const flat = flattenPlanHierarchy(nodes);
  const options: Array<{ id: string; title: string }> = [];
  const seen = new Set<string>();

  for (const node of flat) {
    if (node.type !== "kpi" || node.is_active === false) continue;
    if (!node.plan_node_id || seen.has(node.plan_node_id)) continue;
    seen.add(node.plan_node_id);
    options.push({
      id: node.plan_node_id,
      title: node.title || "Untitled KPI",
    });
  }

  return options.sort((a, b) => a.title.localeCompare(b.title));
}

export function TargetReallocationRequestModal({
  open,
  onOpenChange,
  draftId,
  annualVersionId,
}: TargetReallocationRequestModalProps) {
  const { data: draftVersion } = useGetPlanVersionByIdQuery(draftId, {
    skip: !open || !draftId,
  });
  const liveDraftId =
    draftVersion?.live_master_version_id ||
    draftVersion?.execution_snapshot_of_version_id ||
    draftId;

  const { data: annualVersion } = useGetPlanVersionByIdQuery(annualVersionId, {
    skip: !open || !annualVersionId,
  });
  const liveAnnualVersionId = resolveLiveVersionId(
    annualVersion,
    annualVersionId
  );

  const { data: periodsResponse, isLoading: isPeriodsLoading } =
    useGetExecutionPeriodsQuery(liveAnnualVersionId, {
      skip: !open || !liveAnnualVersionId,
    });

  const { data: liveAnnualHierarchy, isLoading: isHierarchyLoading } =
    useGetPlanHierarchyQuery(liveAnnualVersionId, {
      skip: !open || !liveAnnualVersionId,
    });

  const periods = useMemo(
    () => toLivePeriodOptions(periodsResponse?.executionPeriods ?? []),
    [periodsResponse?.executionPeriods]
  );

  const kpiOptions = useMemo(
    () => collectAnnualKpiOptions(liveAnnualHierarchy ?? []),
    [liveAnnualHierarchy]
  );

  const isLoading = isPeriodsLoading || isHierarchyLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[640px]")}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Add Target Reallocation
          </DialogTitle>
        </DialogHeader>
        <div className={cn(DIALOG_SCROLLABLE_BODY, "px-6 pb-6 space-y-3")}>
          <p className="text-sm text-muted-foreground">
            Move planned target between periods in the same year. Annual target
            stays unchanged. Achievements are not modified.
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <TargetReallocationRequestForm
              draftId={liveDraftId}
              periods={periods}
              kpiOptions={kpiOptions}
              onSubmitted={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
