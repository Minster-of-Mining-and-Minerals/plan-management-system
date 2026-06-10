"use client";

import { useRouter } from "next/navigation";
import { Eye, Lock, PlayCircle, CheckCircle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    useGetAnnualVersionsQuery,
    useCompleteAnnualVersionMutation,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatStatus } from "@/utils/statusFormatter";
import { toast } from "sonner";
import { getDemoCompletionPercent } from "@/utils/performanceColorUtils";
import { cn } from "@/lib/utils";

interface AnnualVersionsDashboardProps {
    masterVersion: PlanVersion;
}

function getAnnualStatusLabel(version: PlanVersion): string {
    if (version.is_locked || version.status === "locked") return "Locked";
    return formatStatus(version.status);
}

export function AnnualVersionsDashboard({ masterVersion }: AnnualVersionsDashboardProps) {
    const router = useRouter();
    const { data, isLoading, refetch } = useGetAnnualVersionsQuery(masterVersion.plan_version_id);
    const [completeAnnual, { isLoading: isCompleting }] = useCompleteAnnualVersionMutation();

    const annualVersions = data?.annualVersions ?? masterVersion.annualVersions ?? [];

    const handleComplete = async (versionId: string, year: number) => {
        if (!confirm(`Mark the ${year} annual version as completed? This will unlock the next year.`)) {
            return;
        }
        try {
            await completeAnnual(versionId).unwrap();
            toast.success(`${year} version completed`);
            refetch();
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err.data?.message || "Failed to complete annual version");
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
            <div>
                <h2 className="text-lg font-semibold text-gray-900">Annual Execution Versions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Sequential yearly plans generated from this strategic draft. Only the active year
                    can be executed; completing a year unlocks the next.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {annualVersions.map((annual) => {
                    const progress = getDemoCompletionPercent(annual.plan_version_id);
                    const isActive = annual.status === "active" && !annual.is_locked;
                    const isLocked = annual.is_locked || annual.status === "locked";
                    const isCompleted = annual.status === "completed";

                    return (
                        <Card
                            key={annual.plan_version_id}
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
                                            <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                                            {annual.planning_year}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {annual.draft_name}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        className="text-white shrink-0"
                                        status={isLocked ? "locked" : annual.status}
                                    >
                                        {getAnnualStatusLabel(annual)}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground pt-1">
                                    Year {annual.sequence_index} of {annualVersions.length}
                                </p>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Progress</span>
                                        <span className="font-medium text-foreground">{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                isCompleted ? "bg-green-600" : "bg-primary"
                                            )}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {isActive && (
                                    <Badge variant="outline" className="gap-1 text-primary border-primary/30 w-fit">
                                        <PlayCircle className="h-3 w-3" />
                                        Active execution year
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
                                            router.push(`/plans/${annual.plan_version_id}`)
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
        </div>
    );
}
