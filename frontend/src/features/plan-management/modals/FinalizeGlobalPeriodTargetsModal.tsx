"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DIALOG_SCROLLABLE_CONTENT } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import {
    useFinalizeGlobalPeriodTargetsMutation,
    useGetGlobalPeriodTargetFinalizationReadinessQuery,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_FINALIZE_PERMISSIONS } from "@/utils/planPermissionUtils";
import { handleDialogOpenChange } from "@/hooks/useSingleFlightAction";

interface FinalizeGlobalPeriodTargetsModalProps {
    isOpen: boolean;
    onClose: () => void;
    masterVersion: PlanVersion;
    onSuccess?: () => void;
}

export function FinalizeGlobalPeriodTargetsModal({
    isOpen,
    onClose,
    masterVersion,
    onSuccess,
}: FinalizeGlobalPeriodTargetsModalProps) {
    const { data: readiness, isLoading, refetch } =
        useGetGlobalPeriodTargetFinalizationReadinessQuery(masterVersion.plan_version_id, {
            skip: !isOpen,
        });
    const [finalize, { reset: resetFinalize }] = useFinalizeGlobalPeriodTargetsMutation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const closedAfterSuccessRef = useRef(false);
    const isCheckingReadiness = isLoading && !readiness;

    useEffect(() => {
        if (!isOpen) {
            closedAfterSuccessRef.current = false;
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleFinalize = async () => {
        if (isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        const successMessage =
            "Period targets finalized for all years and periods. You can now start the process.";

        try {
            await finalize(masterVersion.plan_version_id).unwrap();
            closedAfterSuccessRef.current = true;
            onClose();
            void actionFeedback.success(successMessage);
            onSuccess?.();
        } catch (error: unknown) {
            if (closedAfterSuccessRef.current) {
                return;
            }

            const message = getApiErrorMessage(error, "Failed to finalize period targets");
            if (message.toLowerCase().includes("already been finalized")) {
                closedAfterSuccessRef.current = true;
                onClose();
                void actionFeedback.success(successMessage);
                onSuccess?.();
                return;
            }

            actionFeedback.error(message);
            refetch();
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            resetFinalize();
        }
    };

    const handleClose = () => {
        closedAfterSuccessRef.current = false;
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => handleDialogOpenChange(open, handleClose)}>
            <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[520px]")}>
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Finalize Period Targets</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                    <div className="space-y-4 pb-4 text-sm">
                        <p className="text-muted-foreground">
                            Validates weighted leaf period targets across years and periods. Totals
                            must match each node&apos;s annual target. Divisible KPIs need a share in
                            every period; lump KPIs may concentrate the annual target in fewer periods.
                        </p>

                        {isCheckingReadiness ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking readiness...
                            </div>
                        ) : readiness?.ready ? (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-green-800 font-medium">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    Ready to finalize period targets
                                </div>
                                <p className="text-green-700 text-xs break-words">
                                    Years validated: {readiness.planning_years.join(", ")}
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
                                {readiness.planning_years.map((year) => (
                                    <Badge key={year} variant="outline">
                                        {year}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <PermissionGuard requireAll={PLAN_FINALIZE_PERMISSIONS}>
                        <Button
                            type="button"
                            onClick={handleFinalize}
                            disabled={!readiness?.ready || isSubmitting || isCheckingReadiness}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizing...
                                </>
                            ) : (
                                "Finalize Period Targets"
                            )}
                        </Button>
                    </PermissionGuard>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
