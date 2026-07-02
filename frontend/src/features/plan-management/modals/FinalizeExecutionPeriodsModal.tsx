"use client";

import { useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import {
    useFinalizeExecutionPeriodTargetsMutation,
    useGetExecutionPeriodFinalizationReadinessQuery,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_FINALIZE_PERMISSIONS } from "@/utils/planPermissionUtils";
import { handleDialogOpenChange, useSingleFlightAction } from "@/hooks/useSingleFlightAction";

interface FinalizeExecutionPeriodsModalProps {
    isOpen: boolean;
    onClose: () => void;
    annualVersion: PlanVersion;
    onSuccess?: () => void;
}

export function FinalizeExecutionPeriodsModal({
    isOpen,
    onClose,
    annualVersion,
    onSuccess,
}: FinalizeExecutionPeriodsModalProps) {
    const { data: readiness, isLoading, refetch } =
        useGetExecutionPeriodFinalizationReadinessQuery(annualVersion.plan_version_id, {
            skip: !isOpen,
        });
    const [finalize, { isLoading: isFinalizing }] = useFinalizeExecutionPeriodTargetsMutation();
    const runSingleFlight = useSingleFlightAction();
    const closedAfterSuccessRef = useRef(false);

    const handleFinalize = () => {
        void runSingleFlight(async () => {
            try {
                await finalize(annualVersion.plan_version_id).unwrap();
                closedAfterSuccessRef.current = true;
                actionFeedback.success(
                    `Execution period finalized for ${annualVersion.planning_year ?? annualVersion.year}. Period targets for this year are locked.`
                );
                onSuccess?.();
                onClose();
            } catch (error: unknown) {
                if (closedAfterSuccessRef.current) {
                    return;
                }
                actionFeedback.error(getApiErrorMessage(error, "Failed to finalize period targets"));
                refetch();
            }
        });
    };

    const handleClose = () => {
        closedAfterSuccessRef.current = false;
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => handleDialogOpenChange(open, handleClose)}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Finalize Execution Period</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                    <div className="space-y-4 pb-4 text-sm">
                        <p className="text-muted-foreground">
                            Validates period targets for{" "}
                            <strong>{annualVersion.planning_year ?? annualVersion.year}</strong> only.
                            Every weighted node must have period targets set across all periods for this
                            year, with totals matching that node&apos;s annual target and children
                            matching parent targets in the classification tree.
                        </p>

                        {isLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking readiness...
                            </div>
                        ) : readiness?.ready ? (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                <div className="flex items-center gap-2 text-green-800 font-medium">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    Ready to finalize execution period
                                </div>
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
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isFinalizing}>
                        Cancel
                    </Button>
                    <PermissionGuard requireAll={PLAN_FINALIZE_PERMISSIONS}>
                        <Button
                            type="button"
                            onClick={handleFinalize}
                            disabled={!readiness?.ready || isFinalizing || isLoading}
                        >
                            {isFinalizing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizing...
                                </>
                            ) : (
                                "Finalize Execution Period"
                            )}
                        </Button>
                    </PermissionGuard>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
