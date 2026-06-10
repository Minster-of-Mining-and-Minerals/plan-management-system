"use client";

import { useRouter } from "next/navigation";
import { Eye, Lock, PlayCircle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    useGetExecutionPeriodsQuery,
    useCompleteExecutionPeriodMutation,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import { toast } from "sonner";
import { getDemoCompletionPercent } from "@/utils/performanceColorUtils";
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

    const annualProgress = getDemoCompletionPercent(annualVersion.plan_version_id);

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

            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Annual Achievement</p>
                            <p className="text-2xl font-bold text-gray-900">{annualProgress}%</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {executionPeriods.map((period) => {
                                const periodProgress = getDemoCompletionPercent(period.plan_version_id);
                                const isLocked = period.is_locked || period.status === "locked";
                                return (
                                    <div
                                        key={period.plan_version_id}
                                        className="rounded-lg border bg-white px-3 py-2 text-center min-w-[72px]"
                                    >
                                        <p className="text-xs font-semibold text-gray-700">
                                            {period.period_label}
                                        </p>
                                        <p className="text-sm font-bold">
                                            {isLocked ? "Locked" : `${periodProgress}%`}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {executionPeriods.map((period) => {
                    const progress = getDemoCompletionPercent(period.plan_version_id);
                    const isActive = period.status === "active" && !period.is_locked;
                    const isLocked = period.is_locked || period.status === "locked";
                    const isCompleted = period.status === "completed";
                    const periodLabel = period.period_label ?? `Period ${period.sequence_index}`;

                    return (
                        <Card
                            key={period.plan_version_id}
                            className={cn(
                                "flex flex-col transition-shadow hover:shadow-md",
                                isActive && "border-primary/40 ring-1 ring-primary/20",
                                isLocked && "opacity-90 bg-muted/20"
                            )}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-primary shrink-0" />
                                            {periodLabel}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {period.draft_name}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        className="text-white shrink-0"
                                        status={isLocked ? "locked" : period.status}
                                    >
                                        {getPeriodStatusLabel(period)}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground pt-1">
                                    Period {period.sequence_index} of {executionPeriods.length}
                                </p>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Period Progress</span>
                                        <span className="font-medium text-foreground">
                                            {isLocked ? "—" : `${progress}%`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                isCompleted ? "bg-green-600" : "bg-primary"
                                            )}
                                            style={{ width: isLocked ? "0%" : `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {isActive && (
                                    <Badge variant="outline" className="gap-1 text-primary border-primary/30 w-fit">
                                        <PlayCircle className="h-3 w-3" />
                                        Active execution period
                                    </Badge>
                                )}
                                {isCompleted && (
                                    <Badge variant="secondary" className="gap-1 w-fit">
                                        <CheckCircle className="h-3 w-3" />
                                        Completed
                                    </Badge>
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
