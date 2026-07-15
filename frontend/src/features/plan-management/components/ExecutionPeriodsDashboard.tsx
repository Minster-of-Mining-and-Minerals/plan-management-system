"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    useGetExecutionPeriodsQuery,
    useCompleteExecutionPeriodMutation,
    useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import { actionFeedback } from "@/components/action-feedback";
import {
    resolveCompletionForVersion,
    resolveWorkflowStatusAppearance,
    LOCKED_STATUS_COLOR,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
    PLAN_COMPLETE_PERIOD_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import { PerformanceProgressBar } from "./PerformanceProgressBar";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { EvaluationStatusBadge } from "./EvaluationStatusBadge";
import { getPlanViewBasePath } from "@/utils/planReviewUtils";
import {
    canShowPeriodCompleteButton,
    isPeriodReadyToComplete,
    getExecutionStatusLabel,
    resolvePlanNavigationVersionId,
    resolvePlanVersionStatusLabel,
    resolveWorkflowDisplayStatus,
    resolveExecutionEvaluationStatus,
} from "@/utils/planExecutionUtils";
import { cn } from "@/lib/utils";
import { PlanDetailLoadingPanel } from "./PlanDetailLoadingStates";
import { PeriodCompleteValidationModal } from "./PeriodCompleteValidationModal";

interface ExecutionPeriodsDashboardProps {
    annualVersion: PlanVersion;
    masterVersion?: PlanVersion;
    mode?: "draft" | "review";
}

function formatPlanningStatus(version: Pick<PlanVersion, "status">): string {
    return formatStatus(version.status ?? "draft");
}

function formatSubdivisionMode(mode: string | null | undefined): string {
    if (mode === "quarterly") return "Quarterly";
    if (mode === "semi_annual") return "Semi-annual";
    if (mode === "monthly") return "Monthly";
    if (mode === "custom") return "Custom";
    return "Not set";
}

export function ExecutionPeriodsDashboard({
    annualVersion,
    masterVersion: masterVersionProp,
    mode = "draft",
}: ExecutionPeriodsDashboardProps) {
    const router = useRouter();
    const thresholds = usePerformanceColorThresholds();
    const isReviewMode = mode === "review";
    const plansBasePath = getPlanViewBasePath(mode);

    const parentMasterId = annualVersion.parent_plan_version_id ?? "";
    const { data: fetchedMasterVersion, isLoading: isMasterLoading } = useGetPlanVersionByIdQuery(
        parentMasterId,
        { skip: !parentMasterId || !!masterVersionProp }
    );
    const masterVersion = masterVersionProp ?? fetchedMasterVersion;
    const annualTargetsFinalized = Boolean(masterVersion?.annual_targets_finalized_at);
    const periodsInitializedGlobally = Boolean(masterVersion?.period_subdivision_mode);
    const processStarted = Boolean(masterVersion?.process_started_at);

    const { data, isLoading, refetch } = useGetExecutionPeriodsQuery(annualVersion.plan_version_id);
    const [completePeriod, { isLoading: isCompleting }] = useCompleteExecutionPeriodMutation();
    const [validationPeriod, setValidationPeriod] = useState<PlanVersion | null>(null);

    const annual = data?.annual ?? annualVersion;
    const executionPeriods =
        data?.executionPeriods ?? annualVersion.executionPeriodVersions ?? [];
    const executionSnapshot = data?.executionSnapshot ?? null;
    const periodsInitialized = Boolean(annual.period_subdivision_mode);
    const periodTargetsFinalized = Boolean(annual.period_targets_finalized_at);

    const handleComplete = async (
        period: PlanVersion,
        versionId: string,
        periodLabel: string
    ) => {
        if (!isPeriodReadyToComplete(period)) {
            setValidationPeriod(period);
            return;
        }

        if (
            !(await actionFeedback.confirm(`Mark ${periodLabel} as completed?`))
        ) {
            return;
        }
        try {
            await completePeriod(versionId).unwrap();
            actionFeedback.success(`${periodLabel} completed`);
            refetch();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to complete execution period");
        }
    };

    if ((isLoading || isMasterLoading) && executionPeriods.length === 0) {
        return <PlanDetailLoadingPanel variant="cards" count={4} />;
    }

    if (!annualTargetsFinalized) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                    <Clock className="mx-auto h-10 w-10 mb-3 opacity-40" />
                    <p>Execution periods are not available yet.</p>
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
                        <p>Execution periods have not been initialized yet.</p>
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
                                    `${plansBasePath}/${annualVersion.parent_plan_version_id}`
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
        annual,
        processStarted
    );

    return (
        <div className="space-y-4">
            {validationPeriod && (
                <PeriodCompleteValidationModal
                    open
                    onOpenChange={(open) => {
                        if (!open) setValidationPeriod(null);
                    }}
                    period={validationPeriod}
                    periodLabel={
                        validationPeriod.period_label ??
                        `Period ${validationPeriod.sequence_index}`
                    }
                    plansBasePath={plansBasePath}
                    processStarted={processStarted}
                />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Execution Period Versions</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {periodTargetsFinalized
                            ? `${formatSubdivisionMode(annual.period_subdivision_mode ?? masterVersion?.period_subdivision_mode)} subdivision — execution period targets finalized for this year.`
                            : `${formatSubdivisionMode(annual.period_subdivision_mode ?? masterVersion?.period_subdivision_mode)} subdivision — set period targets in each period so totals match this year's annual targets, then finalize execution period.`}
                    </p>
                </div>
                {/* Finalize button lives on PlanHierarchyView annual tab header */}
            </div>

            {processStarted && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Execution version{" "}
                    {executionSnapshot?.execution_version_number ?? 1} — only the open period
                    accepts updates. Complete each period in order to unlock the next.
                </div>
            )}

            {periodTargetsFinalized && annual.period_targets_finalized_at && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    Execution period finalized for {annual.planning_year ?? annual.year} on{" "}
                    {new Date(annual.period_targets_finalized_at).toLocaleDateString()}.
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
                                {annual.execution_evaluation_status && (
                                    <EvaluationStatusBadge
                                        status={annual.execution_evaluation_status}
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
                                        period,
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
                                                key={period.plan_version_id}
                                                className="rounded-lg border bg-muted/40 px-3 py-2 text-center min-w-[88px]"
                                                style={{ borderColor: LOCKED_STATUS_COLOR }}
                                            >
                                                <p className="text-xs font-semibold text-gray-700">
                                                    {period.period_label}
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
                                            key={period.plan_version_id}
                                            className="rounded-lg border bg-white px-3 py-2 text-center min-w-[88px]"
                                            style={{ borderColor: `${miniColor}55` }}
                                        >
                                            <p className="text-xs font-semibold text-gray-700">
                                                {period.period_label}
                                            </p>
                                            <p
                                                className="text-sm font-bold"
                                                style={{ color: miniColor }}
                                            >
                                                {periodCompletion.visible
                                                    ? `${periodCompletion.percent}%`
                                                    : "—"}
                                            </p>
                                            {period.execution_evaluation_status && (
                                                <EvaluationStatusBadge
                                                    status={
                                                        resolveExecutionEvaluationStatus(
                                                            period,
                                                            processStarted
                                                        )
                                                    }
                                                    className="mt-1 text-[9px] py-0 h-4"
                                                />
                                            )}
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
                        period,
                        processStarted
                    );
                    const isCompleted =
                        period.execution_status === "completed" || period.status === "completed";
                    const periodLabel = period.period_label ?? `Period ${period.sequence_index}`;
                    const showCompleteButton = canShowPeriodCompleteButton(
                        period,
                        processStarted,
                        periodTargetsFinalized
                    );
                    const periodReadyToComplete = isPeriodReadyToComplete(period);
                    const needsActuals =
                        processStarted &&
                        period.execution_status === "open" &&
                        !periodReadyToComplete;
                    const readiness = period.execution_actuals_readiness;
                    const pendingApprovals = readiness?.pending_approval_count ?? 0;
                    const pendingValidations = readiness?.pending_validation_count ?? 0;
                    const pendingSectorPublishes =
                        readiness?.pending_sector_publish_count ?? 0;
                    const rejectedCount = readiness?.rejected_count ?? 0;
                    const readinessSummary =
                        readiness && readiness.required_count > 0
                            ? pendingApprovals > 0
                                ? `${readiness.approved_count ?? 0}/${readiness.required_count} approved · ${pendingApprovals} pending`
                                : pendingValidations > 0
                                  ? `${readiness.approved_count ?? 0}/${readiness.required_count} ready · ${pendingValidations} awaiting validation`
                                  : pendingSectorPublishes > 0
                                    ? `${readiness.approved_count ?? 0}/${readiness.required_count} ready · ${pendingSectorPublishes} sector package${pendingSectorPublishes === 1 ? "" : "s"} pending finalize`
                                : rejectedCount > 0
                                  ? `${readiness.approved_count ?? 0}/${readiness.required_count} approved · ${rejectedCount} rejected`
                                  : `${readiness.approved_count ?? readiness.recorded_count ?? 0}/${readiness.required_count} KPIs ready`
                            : pendingSectorPublishes > 0
                              ? `${pendingSectorPublishes} sector package${pendingSectorPublishes === 1 ? "" : "s"} pending finalize`
                              : null;
                    const executionLocked =
                        processStarted &&
                        period.execution_status === "locked" &&
                        !isCompleted;
                    const executionOpen =
                        processStarted && period.execution_status === "open";
                    const showProgress = completion.visible && !executionLocked;

                    const statusAppearance = resolveWorkflowStatusAppearance(thresholds, {
                        status: resolveWorkflowDisplayStatus(period, processStarted),
                        isLocked: executionLocked,
                        progress: completion,
                        statusLabel: resolvePlanVersionStatusLabel(
                            period,
                            processStarted,
                            formatPlanningStatus
                        ),
                        useAchievementColors: showProgress && !isCompleted,
                    });
                    const evaluationStatus = resolveExecutionEvaluationStatus(
                        period,
                        processStarted
                    );
                    const progressColor = showProgress ? completion.color : LOCKED_STATUS_COLOR;
                    const progressValue = showProgress ? completion.percent : 0;

                    return (
                        <Card
                            key={period.plan_version_id}
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
                                            {periodLabel}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {period.draft_name}
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
                                                <span>Period Progress</span>
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

                                {readinessSummary && processStarted && !isCompleted && (
                                    <p className="text-xs text-muted-foreground">
                                        {readinessSummary}
                                    </p>
                                )}

                                {needsActuals && (
                                    <button
                                        type="button"
                                        className="w-fit"
                                        onClick={() => setValidationPeriod(period)}
                                    >
                                        <PerformanceColorBadge
                                            color={
                                                pendingApprovals > 0
                                                    ? "#f59e0b"
                                                    : rejectedCount > 0
                                                      ? "#ef4444"
                                                      : "#f59e0b"
                                            }
                                            label={
                                                pendingApprovals > 0
                                                    ? "Pending achievement approvals"
                                                    : rejectedCount > 0
                                                      ? "Rejected achievements need resubmit"
                                                      : "Record all KPI achievements"
                                            }
                                            variant="outline"
                                            className="gap-1 w-fit text-xs cursor-pointer hover:opacity-90"
                                        />
                                    </button>
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
                                            `${plansBasePath}/${resolvePlanNavigationVersionId(period, processStarted)}`
                                        )
                                    }
                                >
                                    <Eye className="h-4 w-4" />
                                    {isReviewMode
                                        ? "Review Plan"
                                        : processStarted
                                          ? executionLocked
                                            ? "View (locked)"
                                            : "Open execution"
                                          : "Open Plan"}
                                </Button>
                                {!isReviewMode && showCompleteButton && (
                                    <PermissionGuard requireAll={PLAN_COMPLETE_PERIOD_PERMISSIONS}>
                                        <Button
                                            variant={periodReadyToComplete ? "default" : "outline"}
                                            size="sm"
                                            className={cn(
                                                "gap-2 flex-1",
                                                !periodReadyToComplete &&
                                                    "opacity-70 cursor-not-allowed"
                                            )}
                                            disabled={isCompleting}
                                            aria-disabled={!periodReadyToComplete}
                                            onClick={() =>
                                                handleComplete(
                                                    period,
                                                    period.execution_snapshot_plan_version_id ??
                                                        period.plan_version_id,
                                                    periodLabel
                                                )
                                            }
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Complete
                                        </Button>
                                    </PermissionGuard>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
