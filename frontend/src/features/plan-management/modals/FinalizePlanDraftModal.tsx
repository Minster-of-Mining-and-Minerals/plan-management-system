"use client";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import {
    useFinalizePlanDraftMutation,
    useGetFinalizationReadinessQuery,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { formatPlanningPeriod } from "@/utils/planDraftUtils";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

interface FinalizePlanDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: PlanVersion;
    onSuccess?: () => void;
}

export function FinalizePlanDraftModal({
    isOpen,
    onClose,
    version,
    onSuccess,
}: FinalizePlanDraftModalProps) {
    const { data: readiness, isLoading, refetch } = useGetFinalizationReadinessQuery(
        version.plan_version_id,
        { skip: !isOpen }
    );
    const [finalize, { isLoading: isFinalizing }] = useFinalizePlanDraftMutation();

    const handleFinalize = async () => {
        try {
            const result = await finalize(version.plan_version_id).unwrap();
            actionFeedback.success(
                `Draft finalized. ${result.annualVersions?.length ?? 0} annual version(s) generated. Open the Annual Execution tab to set yearly targets.`
            );
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error, "Failed to finalize draft"));
            refetch();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Finalize Plan Draft</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                    <div className="space-y-4 pb-4 text-sm">
                        <div className="min-w-0 space-y-1 rounded-lg border bg-muted/30 p-4">
                            <p
                                className="truncate font-semibold text-gray-900"
                                title={version.draft_name}
                            >
                                {version.draft_name}
                            </p>
                            <p className="text-muted-foreground">
                                {formatPlanningPeriod(version)} · {version.planning_duration_years}{" "}
                                {version.planning_duration_years === 1 ? "Year" : "Years"}
                            </p>
                        </div>

                        <p className="text-muted-foreground">
                            Finalizing locks the strategic draft and generates one annual execution
                            version per planning year. After finalization, use the Annual Execution
                            tab to unlock each year, set equal annual targets, and finalize annual
                            execution before operational periods.
                        </p>

                        {isLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking readiness...
                            </div>
                        ) : readiness?.ready ? (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-green-800 font-medium">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    Ready to finalize
                                </div>
                                <p className="text-green-700 text-xs break-words">
                                    Will generate annual versions for:{" "}
                                    {readiness.planning_years.join(", ")}
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[min(40dvh,280px)] space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <div className="flex items-center gap-2 font-medium text-amber-900">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    Not ready to finalize
                                </div>
                                <ul className="list-disc space-y-1 break-words pl-5 pr-1 text-xs text-amber-800">
                                    {(readiness?.errors ?? ["Unknown validation error"]).map((err) => (
                                        <li key={err}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {readiness?.planning_years && readiness.planning_years.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {readiness.planning_years.map((year, idx) => (
                                    <Badge key={year} variant="outline">
                                        Year {idx + 1}: {year}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
                    <Button variant="outline" onClick={onClose} disabled={isFinalizing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleFinalize}
                        disabled={!readiness?.ready || isFinalizing || isLoading}
                    >
                        {isFinalizing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Finalizing...
                            </>
                        ) : (
                            "Finalize & Generate Annual Versions"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
