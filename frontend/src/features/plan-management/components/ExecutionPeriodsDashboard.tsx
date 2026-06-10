"use client";

import { useRouter } from "next/navigation";
import { Eye, Lock, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    useGetExecutionPeriodsQuery,
    useCompleteExecutionPeriodMutation,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import { toast } from "sonner";
import {
    resolveCompletionForEntity,
    resolveWorkflowStatusAppearance,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import { PerformanceProgressBar } from "./PerformanceProgressBar";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { cn } from "@/lib/utils";

interface ExecutionPeriodsDashboardProps {
    annualVersion: PlanVersion;
}

function getPeriodStatusLabel(version: PlanVersion): string {
    if (version.is_locked || version.status === "locked") return "Locked";
    return formatStatus(version.status);
}

export function ExecutionPeriodsDashboard({ annualVersion }: ExecutionPeriodsDashboardProps) {
    const router = useRouter();
    const thresholds = usePerformanceColorThresholds();
    const { data, isLoading, refetch } = useGetExecutionPeriodsQuery(annualVersion.plan_version_id);
    const [completePeriod, { isLoading: isCompleting }] = useCompleteExecutionPeriodMutation();

    const executionPeriods =
        data?.executionPeriods ?? annualVersion.executionPeriodVersions ?? [];

    const handleComplete = async (versionId: string, periodLabel: string) => {
        if (
            !confirm(
                `Mark ${periodLabel} as completed? This will unlock the next execution period.`
            )
        ) {
            return;
        }
        try {
            await completePeriod(versionId).unwrap();
            toast.success(`${periodLabel} completed`);
            refetch();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err.data?.message || "Failed to complete execution period");
        }
    };

    if (isLoading && executionPeriods.length === 0) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-5 w-16 rounded bg-muted" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-2 w-full rounded-full bg-muted" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (executionPeriods.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                    <Clock className="mx-auto h-10 w-10 mb-3 opacity-40" />
                    <p>No execution periods have been generated yet.</p>
                    <p className="text-sm mt-1">
                        Execution periods are created automatically when an annual version becomes active.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const annualCompletion = resolveCompletionForEntity(
        thresholds,
        annualVersion.plan_version_id
    );

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Execution Period Versions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Operational execution periods for {annualVersion.planning_year}. Period targets
                    must be allocated manually and cannot exceed the annual target. Only the active
                    period can be executed; completing a period unlocks the next.
                </p>
            </div>

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
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {executionPeriods.map((period) => {
                                const periodCompletion = resolveCompletionForEntity(
                                    thresholds,
                                    period.plan_version_id
                                );
                                const isLocked = period.is_locked || period.status === "locked";
                                const miniColor = isLocked
                                    ? resolveWorkflowStatusAppearance(thresholds, {
                                          status: "locked",
                                          isLocked: true,
                                      }).color
                                    : periodCompletion.color;

                                return (
                                    <div
                                        key={period.plan_version_id}
                                        className="rounded-lg border bg-white px-3 py-2 text-center min-w-[72px]"
                                        style={{ borderColor: `${miniColor}55` }}
                                    >
                                        <p className="text-xs font-semibold text-gray-700">
                                            {period.period_label}
                                        </p>
                                        <p
                                            className="text-sm font-bold"
                                            style={{ color: miniColor }}
                                        >
                                            {isLocked ? "Locked" : `${periodCompletion.percent}%`}
                                        </p>
                                        {!isLocked && (
                                            <p
                                                className="text-[10px] font-medium truncate"
                                                style={{ color: miniColor }}
                                            >
                                                {periodCompletion.label}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {executionPeriods.map((period) => {
                    const completion = resolveCompletionForEntity(
                        thresholds,
                        period.plan_version_id
                    );
                    const isActive = period.status === "active" && !period.is_locked;
                    const isLocked = period.is_locked || period.status === "locked";
                    const isCompleted = period.status === "completed";
                    const periodLabel = period.period_label ?? `Period ${period.sequence_index}`;
                    const statusAppearance = resolveWorkflowStatusAppearance(thresholds, {
                        status: period.status ?? "draft",
                        isLocked,
                        progressPercent: completion.percent,
                        statusLabel: getPeriodStatusLabel(period),
                    });
                    const progressColor = isLocked ? statusAppearance.color : completion.color;
                    const progressValue = isLocked ? 0 : completion.percent;

                    return (
                        <Card
                            key={period.plan_version_id}
                            className={cn(
                                "relative flex flex-col overflow-hidden transition-shadow hover:shadow-md",
                                isActive && "ring-1",
                                isLocked && "opacity-90 bg-muted/20"
                            )}
                            style={
                                isActive
                                    ? {
                                          borderColor: `${completion.color}66`,
                                          boxShadow: `0 0 0 1px ${completion.color}33`,
                                      }
                                    : undefined
                            }
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
                                            <Clock
                                                className="h-4 w-4 shrink-0"
                                                style={{ color: progressColor }}
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
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Period Progress</span>
                                        <span
                                            className="font-medium"
                                            style={{ color: progressColor }}
                                        >
                                            {isLocked ? "—" : `${completion.percent}%`}
                                        </span>
                                    </div>
                                    <PerformanceProgressBar
                                        value={progressValue}
                                        color={progressColor}
                                    />
                                </div>

                                {!isLocked && (
                                    <PerformanceColorBadge
                                        color={completion.color}
                                        label={completion.label}
                                        className="text-[10px] py-0 h-5"
                                    />
                                )}

                                {isActive && (
                                    <PerformanceColorBadge
                                        color={completion.color}
                                        label="Active execution period"
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
                                {!isLocked && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 flex-1"
                                        onClick={() =>
                                            router.push(`/plans/${period.plan_version_id}`)
                                        }
                                    >
                                        <Eye className="h-4 w-4" />
                                        Open Plan
                                    </Button>
                                )}
                                {isLocked && (
                                    <Button variant="ghost" size="sm" disabled className="gap-2 flex-1">
                                        <Lock className="h-4 w-4" />
                                        Locked
                                    </Button>
                                )}
                                {isActive && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="gap-2 flex-1"
                                        disabled={isCompleting}
                                        onClick={() =>
                                            handleComplete(period.plan_version_id, periodLabel)
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
