"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, CheckCircle, CalendarDays, ShieldCheck } from "lucide-react";
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
    resolveCompletionForEntity,
    resolveWorkflowStatusAppearance,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import { usePermissions } from "@/hooks/usePermissions";
import { PerformanceProgressBar } from "./PerformanceProgressBar";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { FinalizeAnnualExecutionModal } from "../modals/FinalizeAnnualExecutionModal";
import { cn } from "@/lib/utils";

interface AnnualVersionsDashboardProps {
    masterVersion: PlanVersion;
}

function getAnnualStatusLabel(version: PlanVersion): string {
    return formatStatus(version.status);
}

export function AnnualVersionsDashboard({ masterVersion }: AnnualVersionsDashboardProps) {
    const router = useRouter();
    const thresholds = usePerformanceColorThresholds();
    const { can } = usePermissions();
    const canApprovePlan = can("PLANS:APPROVE");

    const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

    const { data, isLoading, refetch } = useGetAnnualVersionsQuery(masterVersion.plan_version_id);
    const [completeAnnual, { isLoading: isCompleting }] = useCompleteAnnualVersionMutation();

    const master = data?.master ?? masterVersion;
    const annualVersions = data?.annualVersions ?? masterVersion.annualVersions ?? [];
    const annualTargetsFinalized = Boolean(master.annual_targets_finalized_at);

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
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-5 w-32 rounded bg-muted" />
                            <div className="h-4 w-full rounded bg-muted mt-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-2 w-full rounded-full bg-muted" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
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
                        {annualTargetsFinalized
                            ? "Annual targets are finalized. Open any year to set up execution periods."
                            : "Open any year to set annual targets (totals must match the draft target), then finalize annual execution."}
                    </p>
                </div>
                {!annualTargetsFinalized && canApprovePlan && (
                    <Button
                        className="gap-2 shrink-0"
                        onClick={() => setFinalizeModalOpen(true)}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Finalize Annual Execution
                    </Button>
                )}
            </div>

            {annualTargetsFinalized && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    Annual execution finalized on{" "}
                    {new Date(master.annual_targets_finalized_at!).toLocaleDateString()}. Open the
                    current year, initialize execution periods, set period targets, then finalize
                    period targets. All years remain open for now.
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {annualVersions.map((annual) => {
                    const completion = resolveCompletionForEntity(
                        thresholds,
                        annual.plan_version_id
                    );
                    const isCompleted = annual.status === "completed";
                    const periodTargetsFinalized = Boolean(annual.period_targets_finalized_at);
                    const showComplete =
                        annualTargetsFinalized && periodTargetsFinalized && !isCompleted;

                    const statusAppearance = resolveWorkflowStatusAppearance(thresholds, {
                        status: annual.status ?? "draft",
                        isLocked: false,
                        progressPercent: completion.percent,
                        statusLabel: getAnnualStatusLabel(annual),
                    });
                    const progressColor = completion.color;
                    const progressValue = completion.percent;

                    return (
                        <Card
                            key={annual.plan_version_id}
                            className={cn(
                                "relative flex flex-col overflow-hidden transition-shadow hover:shadow-md",
                                isCompleted && "opacity-90 bg-muted/20"
                            )}
                        >
                            <div
                                className="absolute top-0 left-0 right-0 h-1"
                                style={{
                                    background: `linear-gradient(90deg, ${progressColor}, ${progressColor}55)`,
                                }}
                            />
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CalendarDays
                                                className="h-4 w-4 shrink-0"
                                                style={{ color: progressColor }}
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

                                {annualTargetsFinalized &&
                                    !periodTargetsFinalized &&
                                    !isCompleted && (
                                        <PerformanceColorBadge
                                            color={completion.color}
                                            label="Setup — initialize execution periods"
                                            variant="outline"
                                            className="gap-1 w-fit text-xs"
                                        />
                                    )}
                                {isCompleted && (
                                    <PerformanceColorBadge
                                        color={completion.color}
                                        label="Completed"
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
                                        router.push(`/plans/${annual.plan_version_id}`)
                                    }
                                >
                                    <Eye className="h-4 w-4" />
                                    Open Plan
                                </Button>
                                {showComplete && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="gap-2 flex-1"
                                        disabled={isCompleting}
                                        onClick={() =>
                                            handleComplete(
                                                annual.plan_version_id,
                                                annual.planning_year ?? annual.year
                                            )
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

            <FinalizeAnnualExecutionModal
                isOpen={finalizeModalOpen}
                onClose={() => setFinalizeModalOpen(false)}
                masterVersion={master}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
