"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle, CalendarDays, ShieldCheck, Layers, Play, Lock, Unlock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetRegionalAnnualVersionsQuery,
  useCompleteRegionalAnnualPlanMutation,
  useDistributeRegionalAnnualTargetsEquallyMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";
import { formatStatus } from "@/utils/statusFormatter";
import { actionFeedback } from "@/components/action-feedback";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import {
  resolveCompletionForVersion,
  resolveWorkflowStatusAppearance,
  LOCKED_STATUS_COLOR,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
  canShowAnnualExecutionCompleteAction,
  resolvePlanVersionStatusLabel,
  resolveWorkflowDisplayStatus,
  resolveExecutionEvaluationStatus,
} from "@/utils/planExecutionUtils";
import { PerformanceProgressBar } from "@/features/plan-management/components/PerformanceProgressBar";
import { PerformanceColorBadge } from "@/features/plan-management/components/PerformanceColorBadge";
import { EvaluationStatusBadge } from "@/features/plan-management/components/EvaluationStatusBadge";
import { FinalizeRegionalAnnualExecutionModal } from "../modals/FinalizeRegionalAnnualExecutionModal";
import { InitializeRegionalExecutionPeriodsModal } from "../modals/InitializeRegionalExecutionPeriodsModal";
import { StartRegionalProcessModal } from "../modals/StartRegionalProcessModal";
import { RegionalPlanReviewWorkflowBar } from "./RegionalPlanReviewWorkflowBar";
import { cn } from "@/lib/utils";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface RegionalAnnualVersionsDashboardProps {
  masterVersion: RegionalPlanVersion;
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
  return "the selected";
}

export function RegionalAnnualVersionsDashboard({
  masterVersion,
  regionId,
}: RegionalAnnualVersionsDashboardProps) {
  const router = useRouter();
  const thresholds = usePerformanceColorThresholds();

  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [initPeriodsModalOpen, setInitPeriodsModalOpen] = useState(false);
  const [startProcessModalOpen, setStartProcessModalOpen] = useState(false);

  const { data: annualVersions = [], isLoading, refetch } = useGetRegionalAnnualVersionsQuery(
    { id: masterVersion.regional_plan_version_id, region_id: regionId },
    { skip: !masterVersion?.regional_plan_version_id || !regionId }
  );

  const [completeAnnual, { isLoading: isCompleting }] = useCompleteRegionalAnnualPlanMutation();
  const [distributeAnnualEqually, { isLoading: isDistributing }] =
    useDistributeRegionalAnnualTargetsEquallyMutation();

  const annualTargetsFinalized = Boolean(masterVersion.annual_targets_finalized_at);
  const periodsInitializedGlobally = Boolean(masterVersion.period_subdivision_mode);
  const allAnnualsPeriodFinalized =
    annualVersions.length > 0 &&
    annualVersions.every((annual) => Boolean(annual.period_targets_finalized_at));
  const processStarted = Boolean(masterVersion.process_started_at);
  const reviewStatus = masterVersion.review_status;
  const startProcessReady =
    allAnnualsPeriodFinalized &&
    !processStarted &&
    (reviewStatus === "review_completed" ||
      reviewStatus === "approved" ||
      !masterVersion.published_for_review_at);

  const masterCompletion = resolveCompletionForVersion(
    thresholds,
    masterVersion as any,
    processStarted
  );

  const handleDistributeEqually = async () => {
    try {
      await distributeAnnualEqually({
        id: masterVersion.regional_plan_version_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Annual targets divided equally across planning years");
      refetch();
    } catch (err: unknown) {
      actionFeedback.error(getApiErrorMessage(err, "Failed to distribute annual targets"));
    }
  };

  const handleComplete = async (versionId: string, year: number) => {
    if (!(await actionFeedback.confirm(`Mark Year ${year} annual version as completed?`))) {
      return;
    }
    try {
      await completeAnnual({ id: versionId, region_id: regionId }).unwrap();
      actionFeedback.success(`Year ${year} version completed successfully`);
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to complete annual version");
    }
  };

  if (isLoading && annualVersions.length === 0) {
    return <Loading01 />;
  }

  if (annualVersions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="font-semibold text-foreground">No annual execution versions generated yet.</p>
          <p className="text-sm mt-1">Finalize the strategic plan draft to generate yearly execution plans.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Annual Execution Versions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {annualTargetsFinalized
              ? allAnnualsPeriodFinalized
                ? processStarted
                  ? "Process started. Operational execution is underway."
                  : "All years have finalized execution periods. Start the process when ready."
                : periodsInitializedGlobally
                  ? "Open each year, set period targets, and finalize execution period per year."
                  : "Initialize execution periods once — the same subdivision applies to all years."
              : "Open any year to set annual targets (totals must match the draft target), then finalize annual execution."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {!annualTargetsFinalized && (
            <>
              <Button
                variant="outline"
                className="gap-2 shadow-xs text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                onClick={handleDistributeEqually}
                disabled={isDistributing}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                {isDistributing ? "Dividing..." : "Auto-Divide Annual Targets"}
              </Button>
              <Button className="gap-2 shadow-xs" onClick={() => setFinalizeModalOpen(true)}>
                <ShieldCheck className="h-4 w-4" />
                Finalize Annual Execution
              </Button>
            </>
          )}
          {annualTargetsFinalized && !periodsInitializedGlobally && (
            <Button className="gap-2 shadow-xs" onClick={() => setInitPeriodsModalOpen(true)}>
              <Layers className="h-4 w-4" />
              Initialize Execution Periods
            </Button>
          )}
          {allAnnualsPeriodFinalized && !processStarted && startProcessReady && (
            <Button className="gap-2 shadow-xs" onClick={() => setStartProcessModalOpen(true)}>
              <Play className="h-4 w-4" />
              Start Process
            </Button>
          )}
        </div>
      </div>

      {allAnnualsPeriodFinalized && !processStarted && !startProcessReady && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Complete and close regional plan review before starting process.
        </div>
      )}

      {annualTargetsFinalized && (
        <RegionalPlanReviewWorkflowBar
          master={masterVersion}
          regionId={regionId}
          allPeriodsFinalized={allAnnualsPeriodFinalized}
          processStarted={processStarted}
          onUpdated={() => refetch()}
        />
      )}

      {processStarted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
          Execution version 1 is active. Regional planning targets are frozen; only the open year and period
          accept execution updates. Locked periods remain viewable.
        </div>
      )}

      {annualTargetsFinalized && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-700/50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Annual execution finalized on{" "}
          {new Date(masterVersion.annual_targets_finalized_at!).toLocaleDateString()}.
          {processStarted
            ? ` Process started on ${new Date(masterVersion.process_started_at!).toLocaleDateString()}.`
            : allAnnualsPeriodFinalized
              ? " All years have finalized execution period targets."
              : periodsInitializedGlobally
                ? ` All years use ${formatSubdivisionMode(masterVersion.period_subdivision_mode)} subdivision. Open each year to set and finalize period targets.`
                : " Initialize execution periods once below for all years."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {annualVersions.map((annual) => {
          const completion = resolveCompletionForVersion(
            thresholds,
            annual as any,
            processStarted
          );
          const isCompleted =
            annual.execution_status === "completed" || annual.status === "completed";
          const periodTargetsFinalized = Boolean(annual.period_targets_finalized_at);
          const showComplete = canShowAnnualExecutionCompleteAction(
            annual as any,
            processStarted,
            annualTargetsFinalized && periodTargetsFinalized
          );
          const executionLocked =
            processStarted && annual.execution_status === "locked" && !isCompleted;
          const executionOpen =
            processStarted && annual.execution_status === "open";
          const showProgress = completion.visible && !executionLocked;

          const statusAppearance = resolveWorkflowStatusAppearance(thresholds, {
            status: resolveWorkflowDisplayStatus(annual as any, processStarted),
            isLocked: executionLocked,
            progress: completion,
            statusLabel: resolvePlanVersionStatusLabel(
              annual as any,
              processStarted,
              formatPlanningStatus
            ),
            useAchievementColors: showProgress && !isCompleted,
          });
          const evaluationStatus = resolveExecutionEvaluationStatus(
            annual as any,
            processStarted
          );
          const progressColor = showProgress ? completion.color : LOCKED_STATUS_COLOR;
          const progressValue = showProgress ? completion.percent : 0;

          return (
            <Card
              key={annual.regional_plan_version_id}
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
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        style={
                          showProgress
                            ? { color: progressColor }
                            : executionLocked
                              ? { color: LOCKED_STATUS_COLOR }
                              : undefined
                        }
                      />
                      <span>{annual.planning_year}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {annual.draft_name}
                    </CardDescription>
                  </div>
                  <PerformanceColorBadge
                    color={statusAppearance.color}
                    label={statusAppearance.label}
                    variant="solid"
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Year {annual.sequence_index} of {annualVersions.length}
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
                          {`${completion.percent}% of 100%`}
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
                    {annual.execution_evaluation_status && (
                      <EvaluationStatusBadge
                        status={evaluationStatus}
                        className="text-[10px] py-0 h-5"
                      />
                    )}
                  </>
                )}

                {annualTargetsFinalized &&
                  periodsInitializedGlobally &&
                  !periodTargetsFinalized &&
                  !isCompleted && (
                    <PerformanceColorBadge
                      color="#94a3b8"
                      label="Setup — finalize execution period"
                      variant="outline"
                      className="gap-1 w-fit text-xs"
                    />
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
                    label="Locked until prior year completes"
                    variant="outline"
                    className="gap-1 w-fit text-xs"
                  />
                )}
                {periodTargetsFinalized && !isCompleted && !processStarted && (
                  <PerformanceColorBadge
                    color={completion.color}
                    label="Execution period finalized"
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
                      `/regions/${regionId}/plans/${annual.regional_plan_version_id}`
                    )
                  }
                >
                  <Eye className="h-4 w-4" />
                  {processStarted
                    ? executionLocked
                      ? "View (locked)"
                      : "Open execution"
                    : "Open Plan"}
                </Button>
                {showComplete && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 flex-1"
                    disabled={isCompleting}
                    onClick={() =>
                      handleComplete(annual.regional_plan_version_id, annual.planning_year ?? 0)
                    }
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete Year
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <FinalizeRegionalAnnualExecutionModal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        masterVersion={masterVersion}
        regionId={regionId}
        onSuccess={() => refetch()}
      />

      <InitializeRegionalExecutionPeriodsModal
        isOpen={initPeriodsModalOpen}
        onClose={() => setInitPeriodsModalOpen(false)}
        masterVersion={masterVersion}
        regionId={regionId}
        planningYears={annualVersions.map((annual) => annual.planning_year ?? 0).filter(Boolean)}
        onSuccess={() => refetch()}
      />

      <StartRegionalProcessModal
        isOpen={startProcessModalOpen}
        onClose={() => setStartProcessModalOpen(false)}
        masterVersion={masterVersion}
        regionId={regionId}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
