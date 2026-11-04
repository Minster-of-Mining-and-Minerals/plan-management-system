"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetRegionalExecutionPeriodsQuery,
  useCompleteRegionalExecutionPeriodMutation,
  useGetRegionalPlanVersionByIdQuery,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";
import { formatStatus } from "@/utils/statusFormatter";
import { actionFeedback } from "@/components/action-feedback";
import {
  resolveCompletionForVersion,
  resolveWorkflowStatusAppearance,
  LOCKED_STATUS_COLOR,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
  canShowPeriodCompleteButton,
  resolvePlanVersionStatusLabel,
  resolveWorkflowDisplayStatus,
  resolveExecutionEvaluationStatus,
} from "@/utils/planExecutionUtils";
import { PerformanceProgressBar } from "@/features/plan-management/components/PerformanceProgressBar";
import { PerformanceColorBadge } from "@/features/plan-management/components/PerformanceColorBadge";
import { EvaluationStatusBadge } from "@/features/plan-management/components/EvaluationStatusBadge";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface RegionalExecutionPeriodsDashboardProps {
  annualVersion: RegionalPlanVersion;
  masterVersion?: RegionalPlanVersion;
  regionId: string;
}

function formatPlanningStatus(version: Pick<RegionalPlanVersion, "status">): string {
  return formatStatus(version.status ?? "draft");
}

function formatSubdivisionMode(mode: string | null | undefined): string {
  if (mode === "quarterly") return "Quarterly";
  if (mode === "semi_annual") return "Semi-annual";
  if (mode === "monthly") return "Monthly";
  if (mode === "custom") return "Custom";
  return "Not set";
}

export function RegionalExecutionPeriodsDashboard({
  annualVersion,
  masterVersion: masterVersionProp,
  regionId,
}: RegionalExecutionPeriodsDashboardProps) {
  const router = useRouter();
  const thresholds = usePerformanceColorThresholds();

  const parentMasterId = annualVersion.parent_plan_version_id ?? "";
  const { data: fetchedMasterVersion, isLoading: isMasterLoading } = useGetRegionalPlanVersionByIdQuery(
    { id: parentMasterId, region_id: regionId },
    { skip: !parentMasterId || !!masterVersionProp || !regionId }
  );
  const masterVersion = masterVersionProp ?? fetchedMasterVersion;
  const annualTargetsFinalized = Boolean(masterVersion?.annual_targets_finalized_at || annualVersion.annual_targets_finalized_at);
  const periodsInitializedGlobally = Boolean(masterVersion?.period_subdivision_mode || annualVersion.period_subdivision_mode);
  const processStarted = Boolean(masterVersion?.process_started_at || annualVersion.process_started_at);

  const { data: executionPeriods = [], isLoading, refetch } = useGetRegionalExecutionPeriodsQuery(
    { id: annualVersion.regional_plan_version_id, region_id: regionId },
    { skip: !annualVersion?.regional_plan_version_id || !regionId }
  );
  const [completePeriod, { isLoading: isCompleting }] = useCompleteRegionalExecutionPeriodMutation();

  const periodsInitialized = Boolean(annualVersion.period_subdivision_mode);
  const periodTargetsFinalized = Boolean(annualVersion.period_targets_finalized_at);

  const handleComplete = async (versionId: string, periodLabel: string) => {
    if (!(await actionFeedback.confirm(`Mark ${periodLabel} as completed?`))) {
      return;
    }
    try {
      await completePeriod({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success(`${periodLabel} completed successfully`);
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to complete execution period");
    }
  };

  if ((isLoading || isMasterLoading) && executionPeriods.length === 0) {
    return <Loading01 />;
  }

  if (!annualTargetsFinalized) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-semibold text-foreground">Execution periods are not available yet.</p>
          <p className="text-sm mt-1">
            Finalize annual execution on the strategic plan first, then initialize
            execution periods once from the Annual Execution tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!periodsInitialized && !periodsInitializedGlobally) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground space-y-4">
          <Clock className="mx-auto h-10 w-10 opacity-40" />
          <div>
            <p className="font-semibold text-foreground">Execution periods have not been initialized yet.</p>
            <p className="text-sm mt-1">
              Go to the strategic plan&apos;s <strong>Annual Execution</strong> tab and
              use <strong>Initialize Execution Periods</strong> once — the same
              subdivision applies to all years.
            </p>
          </div>
          {annualVersion.parent_plan_version_id && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                router.push(
                  `/regions/${regionId}/plans/${annualVersion.parent_plan_version_id}?tab=annual`
                )
              }
            >
              Open Strategic Plan
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const annualCompletion = resolveCompletionForVersion(
    thresholds,
    annualVersion as any,
    processStarted
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Execution Period Versions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {periodTargetsFinalized
              ? `${formatSubdivisionMode(annualVersion.period_subdivision_mode ?? masterVersion?.period_subdivision_mode)} subdivision — execution period targets finalized for this year.`
              : `${formatSubdivisionMode(annualVersion.period_subdivision_mode ?? masterVersion?.period_subdivision_mode)} subdivision — set period targets (divisible across all periods, or lump into delivery periods) so totals match this year's annual targets, then finalize execution period.`}
          </p>
        </div>
      </div>

      {processStarted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
          Execution version 1 — only the open period accepts updates. Complete each period in order to unlock the next.
        </div>
      )}

      {periodTargetsFinalized && annualVersion.period_targets_finalized_at && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-900 dark:text-green-200">
          Execution period finalized for Year {annualVersion.planning_year ?? annualVersion.year} on{" "}
          {new Date(annualVersion.period_targets_finalized_at).toLocaleDateString()}.
        </div>
      )}

      {annualCompletion.visible && (
        <Card
          className="border"
          style={{
            borderColor: `${annualCompletion.color}44`,
            backgroundColor: `${annualCompletion.color}0A`,
          }}
        >
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Annual Achievement</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: annualCompletion.color }}
                >
                  {annualCompletion.percent}%
                </p>
                <PerformanceColorBadge
                  color={annualCompletion.color}
                  label={annualCompletion.label}
                  className="mt-1 text-[10px] py-0 h-5"
                />
                {annualVersion.execution_evaluation_status && (
                  <EvaluationStatusBadge
                    status={annualVersion.execution_evaluation_status as any}
                    className="mt-1 text-[10px] py-0 h-5"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {executionPeriods.map((period) => {
                  const periodLocked =
                    processStarted && period.execution_status === "locked";
                  const periodCompletion = resolveCompletionForVersion(
                    thresholds,
                    period as any,
                    processStarted
                  );
                  if (
                    !periodLocked &&
                    !periodCompletion.visible &&
                    !period.execution_is_evaluable
                  ) {
                    return null;
                  }

                  if (periodLocked) {
                    return (
                      <div
                        key={period.regional_plan_version_id}
                        className="rounded-lg border bg-muted/40 px-3 py-2 text-center min-w-[88px]"
                        style={{ borderColor: LOCKED_STATUS_COLOR }}
                      >
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {period.period_label || `Period ${period.sequence_index}`}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                          Locked
                        </p>
                      </div>
                    );
                  }

                  const miniColor = periodCompletion.visible
                    ? periodCompletion.color
                    : "#9CA3AF";

                  return (
                    <div
                      key={period.regional_plan_version_id}
                      className="rounded-lg border bg-card px-3 py-2 text-center min-w-[88px]"
                      style={{ borderColor: `${miniColor}55` }}
                    >
                      <p className="text-xs font-semibold text-foreground">
                        {period.period_label || `Period ${period.sequence_index}`}
                      </p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: miniColor }}
                      >
                        {periodCompletion.visible
                          ? `${periodCompletion.percent}%`
                          : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {executionPeriods.map((period) => {
          const completion = resolveCompletionForVersion(
            thresholds,
            period as any,
            processStarted
          );
          const isCompleted =
            period.execution_status === "completed" || period.status === "completed";
          const periodLabel = period.period_label ?? `Period ${period.sequence_index}`;
          const showCompleteButton = canShowPeriodCompleteButton(
            period as any,
            processStarted,
            periodTargetsFinalized
          );

          const executionLocked =
            processStarted && period.execution_status === "locked" && !isCompleted;
          const executionOpen =
            processStarted && period.execution_status === "open";
          const showProgress = completion.visible && !executionLocked;

          const statusAppearance = resolveWorkflowStatusAppearance(thresholds, {
            status: resolveWorkflowDisplayStatus(period as any, processStarted),
            isLocked: executionLocked,
            progress: completion,
            statusLabel: resolvePlanVersionStatusLabel(
              period as any,
              processStarted,
              formatPlanningStatus
            ),
            useAchievementColors: showProgress && !isCompleted,
          });
          const evaluationStatus = resolveExecutionEvaluationStatus(
            period as any,
            processStarted
          );
          const progressColor = showProgress ? completion.color : LOCKED_STATUS_COLOR;
          const progressValue = showProgress ? completion.percent : 0;

          return (
            <Card
              key={period.regional_plan_version_id}
              className={cn(
                "relative flex flex-col overflow-hidden transition-shadow hover:shadow-md",
                isCompleted && "opacity-90 bg-muted/20",
                executionLocked && "bg-muted/40 border-muted-foreground/30"
              )}
              style={
                executionLocked
                  ? { borderColor: LOCKED_STATUS_COLOR }
                  : undefined
              }
            >
              {showProgress && (
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${progressColor}, ${progressColor}55)`,
                  }}
                />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        style={
                          showProgress
                            ? { color: progressColor }
                            : executionLocked
                              ? { color: LOCKED_STATUS_COLOR }
                              : undefined
                        }
                      />
                      <span className="truncate">{periodLabel}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {period.draft_name || `Year ${period.planning_year} Execution`}
                    </CardDescription>
                  </div>
                  <PerformanceColorBadge
                    color={statusAppearance.color}
                    label={statusAppearance.label}
                    variant="solid"
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Period {period.sequence_index} of {executionPeriods.length}
                </p>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {showProgress && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span
                          className="font-medium"
                          style={{ color: progressColor }}
                        >
                          {`${completion.percent}%`}
                        </span>
                      </div>
                      <PerformanceProgressBar
                        value={progressValue}
                        color={progressColor}
                      />
                    </div>

                    <PerformanceColorBadge
                      color={completion.color}
                      label={completion.label}
                      className="text-[10px] py-0 h-5"
                    />
                    {period.execution_evaluation_status && (
                      <EvaluationStatusBadge
                        status={evaluationStatus}
                        className="text-[10px] py-0 h-5"
                      />
                    )}
                  </>
                )}

                {executionOpen && (
                  <PerformanceColorBadge
                    color="#94a3b8"
                    label="Open for execution"
                    variant="outline"
                    className="gap-1 w-fit text-xs"
                  />
                )}
                {executionLocked && (
                  <PerformanceColorBadge
                    color={LOCKED_STATUS_COLOR}
                    label="Locked until prior period completes"
                    variant="outline"
                    className="gap-1 w-fit text-xs"
                  />
                )}
                {isCompleted && (
                  <PerformanceColorBadge
                    color={completion.visible ? completion.color : "#9CA3AF"}
                    label={
                      completion.visible
                        ? `Closed at ${completion.percent}%`
                        : "Completed"
                    }
                    variant="outline"
                    className="gap-1 w-fit text-xs"
                  />
                )}
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() =>
                    router.push(
                      `/regions/${regionId}/plans/${period.regional_plan_version_id}`
                    )
                  }
                >
                  <Eye className="h-4 w-4" />
                  {processStarted
                    ? executionLocked
                      ? "View (locked)"
                      : "Open execution"
                    : "Open Period"}
                </Button>
                {showCompleteButton && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 flex-1"
                    disabled={isCompleting}
                    onClick={() =>
                      handleComplete(period.regional_plan_version_id, periodLabel)
                    }
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

