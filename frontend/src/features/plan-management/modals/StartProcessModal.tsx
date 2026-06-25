"use client";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_START_PROCESS_PERMISSIONS } from "@/utils/planPermissionUtils";
import {
    useGetStartProcessReadinessQuery,
    useStartPlanProcessMutation,
} from "@/redux/api/planApi";
import { PlanVersion } from "@/redux/types/plan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

interface StartProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    masterVersion: PlanVersion;
    onSuccess?: () => void;
}

export function StartProcessModal({
    isOpen,
    onClose,
    masterVersion,
    onSuccess,
}: StartProcessModalProps) {
    const { data: readiness, isLoading, refetch } = useGetStartProcessReadinessQuery(
        masterVersion.plan_version_id,
        { skip: !isOpen }
    );
    const [startProcess, { isLoading: isStarting }] = useStartPlanProcessMutation();

    const handleStart = async () => {
        try {
            await startProcess(masterVersion.plan_version_id).unwrap();
            actionFeedback.success("Plan process started successfully");
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error, "Failed to start process"));
            refetch();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Start Process</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                    <div className="space-y-4 pb-4 text-sm">
                        <p className="text-muted-foreground">
                            Creates execution version 1 of the approved plan tree, freezes planning
                            targets, and opens the first period for operational execution. Later
                            periods and years stay locked until their predecessor completes.
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
                                    Ready to start operational execution
                                </div>
                            </div>
                        ) : (
                            <div className="max-h-[min(40dvh,280px)] space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <div className="flex items-center gap-2 font-medium text-amber-900">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    Not ready to start process
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
                    <Button variant="outline" onClick={onClose} disabled={isStarting}>
                        Cancel
                    </Button>
                    <PermissionGuard requireAll={PLAN_START_PROCESS_PERMISSIONS}>
                        <Button
                            onClick={handleStart}
                            disabled={!readiness?.ready || isStarting || isLoading}
                            className="gap-2"
                        >
                            {isStarting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4" />
                                    Start Process
                                </>
                            )}
                        </Button>
                    </PermissionGuard>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
