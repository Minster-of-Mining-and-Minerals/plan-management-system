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
import { toast } from "sonner";
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
            toast.success(
                `Draft finalized. ${result.annualVersions?.length ?? 0} annual version(s) generated.`
            );
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Failed to finalize draft"));
            refetch();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Finalize Plan Draft</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                        <p className="font-semibold text-gray-900">{version.draft_name}</p>
                        <p className="text-muted-foreground">
                            {formatPlanningPeriod(version)} · {version.planning_duration_years}{" "}
                            {version.planning_duration_years === 1 ? "Year" : "Years"}
                        </p>
                    </div>

                    <p className="text-muted-foreground">
                        Finalizing locks the strategic draft and generates one annual execution
                        version per planning year. Hierarchy, assignments, and strategic targets
                        are copied to each year.
                    </p>

                    {isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking readiness...
                        </div>
                    ) : readiness?.ready ? (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-green-800 font-medium">
                                <CheckCircle2 className="h-5 w-5" />
                                Ready to finalize
                            </div>
                            <p className="text-green-700 text-xs">
                                Will generate annual versions for:{" "}
                                {readiness.planning_years.join(", ")}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-amber-900 font-medium">
                                <AlertCircle className="h-5 w-5" />
                                Not ready to finalize
                            </div>
                            <ul className="list-disc pl-5 text-amber-800 text-xs space-y-1">
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

                <DialogFooter>
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
