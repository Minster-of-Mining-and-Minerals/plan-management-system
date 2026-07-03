"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle, CalendarDays, ShieldCheck, Layers, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    useGetAnnualVersionsQuery,
    useCompleteAnnualVersionMutation,
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
    PLAN_COMPLETE_ANNUAL_PERMISSIONS,
    PLAN_FINALIZE_PERMISSIONS,
    PLAN_START_PROCESS_PERMISSIONS,
    PLAN_UPDATE_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import { PlanReviewWorkflowBar } from "./PlanReviewWorkflowBar";
import { canStartProcessAfterReview, getPlanViewBasePath } from "@/utils/planReviewUtils";
import {
    canShowAnnualExecutionCompleteAction,
    getExecutionStatusLabel,
    resolvePlanNavigationVersionId,
    resolvePlanVersionStatusLabel,
} from "@/utils/planExecutionUtils";
import { PerformanceProgressBar } from "./PerformanceProgressBar";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { EvaluationStatusBadge } from "./EvaluationStatusBadge";
import { FinalizeAnnualExecutionModal } from "../modals/FinalizeAnnualExecutionModal";
import { InitializeExecutionPeriodsModal } from "../modals/InitializeExecutionPeriodsModal";
import { StartProcessModal } from "../modals/StartProcessModal";
import { cn } from "@/lib/utils";
import { PlanDetailLoadingPanel } from "./PlanDetailLoadingStates";

interface AnnualVersionsDashboardProps {
    masterVersion: PlanVersion;
    mode?: "draft" | "review";
}

function formatPlanningStatus(version: Pick<PlanVersion, "status">): string {
    return formatStatus(version.status ?? "draft");
}

function formatSubdivisionMode(mode: string | null | undefined): string {
    if (mode === "quarterly") return "Quarterly";
    if (mode === "semi_annual") return "Semi-annual";
    if (mode === "custom") return "Custom";
    return "the selected";
}

export function AnnualVersionsDashboard({
    masterVersion,
    mode = "draft",
}: AnnualVersionsDashboardProps) {
    const router = useRouter();
    const thresholds = usePerformanceColorThresholds();
    const isReviewMode = mode === "review";
    const plansBasePath = getPlanViewBasePath(mode);

    const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
    const [initPeriodsModalOpen, setInitPeriodsModalOpen] = useState(false);
    const [startProcessModalOpen, setStartProcessModalOpen] = useState(false);

    const { data, isLoading, refetch } = useGetAnnualVersionsQuery(masterVersion.plan_version_id);
    const [completeAnnual, { isLoading: isCompleting }] = useCompleteAnnualVersionMutation();

    const master = data?.master ?? masterVersion;
    const annualVersions = data?.annualVersions ?? masterVersion.annualVersions ?? [];
    const executionSnapshot = data?.executionSnapshot ?? null;
    const annualTargetsFinalized = Boolean(master.annual_targets_finalized_at);
    const periodsInitializedGlobally = Boolean(master.period_subdivision_mode);
    const allAnnualsPeriodFinalized =
        annualVersions.length > 0 &&
        annualVersions.every((annual) => Boolean(annual.period_targets_finalized_at));
    const processStarted = Boolean(master.process_started_at);
    const startProcessReady = canStartProcessAfterReview(master);
    const masterCompletion = resolveCompletionForVersion(
        thresholds,
        master,
        processStarted
    );

    const handleComplete = async (versionId: string, year: number) => {
        if (!(await actionFeedback.confirm(`Mark the ${year} annual version as completed?`))) {
            return;
        }
        try {
            await completeAnnual(versionId).unwrap();
            actionFeedback.success(`${year} version completed`);
            refetch();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            actionFeedback.error(err.data?.message || "Failed to complete annual version");
        }
    };

    if (isLoading && annualVersions.length === 0) {
        return <PlanDetailLoadingPanel variant="cards" count={3} />;
    }

    if (annualVersions.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                    <CalendarDays className="mx-auto h-10 w-10 mb-3 opacity-40" />
                    <p>No annual execution versions have been generated yet.</p>
                    <p className="text-sm mt-1">Finalize the strategic draft to create yearly execution plans.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Annual Execution Versions</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isReviewMode
                            ? "Browse the full published plan across strategic, annual, and execution period views. Raise issues and track findings in the Review Dashboard."
                            : annualTargetsFinalized
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
                {!isReviewMode && (
                <div className="flex flex-wrap gap-2 shrink-0">
                    {!annualTargetsFinalized && (
                        <PermissionGuard requireAll={PLAN_FINALIZE_PERMISSIONS}>
                            <Button className="gap-2" onClick={() => setFinalizeModalOpen(true)}>
                                <ShieldCheck className="h-4 w-4" />
                                Finalize Annual Execution
                            </Button>
                        </PermissionGuard>
                    )}
                    {annualTargetsFinalized && !periodsInitializedGlobally && (
                        <PermissionGuard requireAll={PLAN_UPDATE_PERMISSIONS}>
                            <Button className="gap-2" onClick={() => setInitPeriodsModalOpen(true)}>
                                <Layers className="h-4 w-4" />
                                Initialize Execution Periods
                            </Button>
                        </PermissionGuard>
                    )}
                    {allAnnualsPeriodFinalized && !processStarted && startProcessReady && (
                        <PermissionGuard requireAll={PLAN_START_PROCESS_PERMISSIONS}>
                            <Button className="gap-2" onClick={() => setStartProcessModalOpen(true)}>
                                <Play className="h-4 w-4" />
                                Start Process
                            </Button>
                        </PermissionGuard>
                    )}
                </div>
                )}
            </div>

            {!isReviewMode && allAnnualsPeriodFinalized && !processStarted && !startProcessReady && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {master.published_for_review_at
                        ? "Complete and close plan review before starting process."
                        : "Publish the plan for review at least once, then complete and close review before starting process."}
                </div>
            )}

            {!isReviewMode && (
                <PlanReviewWorkflowBar
                    master={master}
                    allPeriodsFinalized={allAnnualsPeriodFinalized}
                    processStarted={processStarted}
                    onUpdated={refetch}
                />
            )}

            {!isReviewMode && processStarted && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    Execution version{" "}
                    {executionSnapshot?.execution_version_number ?? master.execution_version_number ?? 1}{" "}
                    is active. Planning targets are frozen; only the open year and period accept
                    execution updates. Locked periods remain viewable.
                </div>
            )}

            {!isReviewMode && processStarted && masterCompletion.visible && (
                <Card
                    className="border"
                    style={{ borderColor: `${masterCompletion.color}44` }}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Plan achievement</CardTitle>
                        <CardDescription>
                            Average across evaluable planning years
                            {master.active_planning_year != null
                                ? ` — year ${master.active_planning_year} is currently open`
                                : ""}
                            . Years without targets are excluded.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <PerformanceColorBadge
                                color={masterCompletion.color}
                                label={`${masterCompletion.percent}%`}
                                variant="solid"
                            />
                            {masterCompletion.label && (
                                <span className="text-sm text-muted-foreground">
                                    {masterCompletion.label}
                                </span>
                            )}
                            {master.execution_evaluation_status && (
                                <EvaluationStatusBadge
                                    status={master.execution_evaluation_status}
                                />
                            )}
                        </div>
                        <PerformanceProgressBar
                            value={masterCompletion.percent}
                            color={masterCompletion.color}
                        />
                    </CardContent>
                </Card>
            )}

            {!isReviewMode && annualTargetsFinalized && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    Annual execution finalized on{" "}
                    {new Date(master.annual_targets_finalized_at!).toLocaleDateString()}.
                    {processStarted
                        ? ` Process started on ${new Date(master.process_started_at!).toLocaleDateString()}.`
                        : allAnnualsPeriodFinalized
                          ? " All years have finalized execution period targets."
                          : periodsInitializedGlobally
                            ? ` All years use ${formatSubdivisionMode(master.period_subdivision_mode)} subdivision. Open each year to set and finalize period targets.`
                            : " Initialize execution periods once below for all years."}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {annualVersions.map((annual) => {
                    const completion = resolveCompletionForVersion(
                        thresholds,
                        annual,
                        processStarted
                    );
                    const isCompleted =
                        annual.execution_status === "completed" || annual.status === "completed";
                    const periodTargetsFinalized = Boolean(annual.period_targets_finalized_at);
                    const showComplete = canShowAnnualExecutionCompleteAction(
                        annual,
                        processStarted,
                        annualTargetsFinalized && periodTargetsFinalized
                    );
                    const awaitingPeriods =
                        processStarted &&
                        annual.execution_status === "open" &&
                        !annual.all_execution_periods_completed &&
                        !isCompleted;
                    const executionLocked =
                        processStarted &&
                        annual.execution_status === "locked" &&
                        !isCompleted;
                    const executionOpen =
                        processStarted && annual.execution_status === "open";
                    const showProgress = completion.visible && !executionLocked;

                    const statusAppearance = resolveWorkflowStatusAppearance(thresholds, {
                        status: annual.status ?? "draft",
                        isLocked: executionLocked,
                        progress: completion,
                        statusLabel: resolvePlanVersionStatusLabel(
                            annual,
                            processStarted,
                            formatPlanningStatus
                        ),
                        useAchievementColors: showProgress,
                    });
                    const progressColor = showProgress ? completion.color : LOCKED_STATUS_COLOR;
                    const progressValue = showProgress ? completion.percent : 0;

                    return (
                        <Card
                            key={annual.plan_version_id}
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
                                            {annual.planning_year}
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
                                        {annual.execution_evaluation_status && (
                                            <EvaluationStatusBadge
                                                status={annual.execution_evaluation_status}
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
                                {awaitingPeriods && (
                                    <PerformanceColorBadge
                                        color="#94a3b8"
                                        label={`${annual.execution_periods_completed ?? 0}/${annual.execution_periods_total ?? 0} periods done`}
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
                                            `${plansBasePath}/${resolvePlanNavigationVersionId(annual, processStarted)}`
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
                                {!isReviewMode && showComplete && (
                                    <PermissionGuard requireAll={PLAN_COMPLETE_ANNUAL_PERMISSIONS}>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="gap-2 flex-1"
                                            disabled={isCompleting}
                                            onClick={() =>
                                                handleComplete(
                                                    annual.execution_snapshot_plan_version_id ??
                                                        annual.plan_version_id,
                                                    annual.planning_year ?? annual.year
                                                )
                                            }
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Complete Year
                                        </Button>
                                    </PermissionGuard>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            <FinalizeAnnualExecutionModal
                isOpen={finalizeModalOpen}
                onClose={() => setFinalizeModalOpen(false)}
                masterVersion={master}
                onSuccess={() => refetch()}
            />

            <InitializeExecutionPeriodsModal
                isOpen={initPeriodsModalOpen}
                onClose={() => setInitPeriodsModalOpen(false)}
                masterVersion={master}
                planningYears={annualVersions.map(
                    (annual) => annual.planning_year ?? annual.year
                )}
                onSuccess={() => refetch()}
            />

            <StartProcessModal
                isOpen={startProcessModalOpen}
                onClose={() => setStartProcessModalOpen(false)}
                masterVersion={master}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
