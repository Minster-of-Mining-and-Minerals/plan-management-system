"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetExecutionPeriodsQuery,
  useGetPlanHierarchyQuery,
  useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import type { PlanNodeHierarchy, PlanVersion } from "@/redux/types/plan";
import { flattenPlanHierarchy } from "@/utils/planAchievementHierarchyUtils";
import { TargetReallocationRequestForm } from "./TargetReallocationRequestForm";
import { TargetReallocationRequestTable } from "./TargetReallocationRequestTable";

type TargetReallocationSectionProps = {
  draftId: string;
  annualVersionId: string;
  /** Optional hierarchy hint; live annual hierarchy is preferred for KPI ids */
  hierarchy?: PlanNodeHierarchy[];
  className?: string;
};

function resolveLiveVersionId(version: PlanVersion | null | undefined, fallbackId: string): string {
  return version?.execution_snapshot_of_version_id || fallbackId;
}

function toLivePeriodOptions(periods: PlanVersion[]): PlanVersion[] {
  return periods.map((period) => ({
    ...period,
    plan_version_id: period.execution_snapshot_of_version_id || period.plan_version_id,
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

export function TargetReallocationSection({
  draftId,
  annualVersionId,
  className,
}: TargetReallocationSectionProps) {
  const searchParams = useSearchParams();
  const focusReallocation = searchParams.get("focus") === "reallocation";
  const sectionRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!focusReallocation) return;
    setExpanded(true);
    const timer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusReallocation]);

  const { data: draftVersion } = useGetPlanVersionByIdQuery(draftId, {
    skip: !draftId,
  });
  const liveDraftId =
    draftVersion?.live_master_version_id ||
    draftVersion?.execution_snapshot_of_version_id ||
    draftId;

  const { data: annualVersion } = useGetPlanVersionByIdQuery(annualVersionId, {
    skip: !annualVersionId,
  });

  const liveAnnualVersionId = resolveLiveVersionId(annualVersion, annualVersionId);

  const { data: periodsResponse, isLoading: isPeriodsLoading } =
    useGetExecutionPeriodsQuery(liveAnnualVersionId, {
      skip: !liveAnnualVersionId,
    });

  const { data: liveAnnualHierarchy, isLoading: isHierarchyLoading } =
    useGetPlanHierarchyQuery(liveAnnualVersionId, {
      skip: !liveAnnualVersionId,
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
    <div
      ref={sectionRef}
      id="target-reallocation-section"
      className={cn(
        "rounded-lg border border-sky-200 bg-sky-50/70 text-sky-950",
        focusReallocation && "ring-2 ring-sky-400/70",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <ArrowLeftRight className="h-4 w-4 shrink-0" />
        <span>Target Reallocation</span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-sky-200/80 px-4 py-4">
          <div>
            <p className="text-sm font-medium">Request a reallocation</p>
            <p className="mt-1 text-xs text-sky-900/80">
              Move planned target between periods in the same year. Annual
              target stays unchanged. Achievements are not modified.
            </p>
            <div className="mt-3">
              {isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                <TargetReallocationRequestForm
                  draftId={liveDraftId}
                  periods={periods}
                  kpiOptions={kpiOptions}
                />
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Requests</p>
            <TargetReallocationRequestTable draftId={liveDraftId} />
          </div>
        </div>
      )}
    </div>
  );
}
