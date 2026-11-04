"use client";

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
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import {
  useFinalizeRegionalPeriodTargetsMutation,
  useGetRegionalPeriodFinalizationReadinessQuery,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

interface FinalizeRegionalExecutionPeriodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  annualVersion: RegionalPlanVersion;
  regionId: string;
  onSuccess?: () => void;
}

export function FinalizeRegionalExecutionPeriodsModal({
  isOpen,
  onClose,
  annualVersion,
  regionId,
  onSuccess,
}: FinalizeRegionalExecutionPeriodsModalProps) {
  const { data: readiness, isLoading, refetch } = useGetRegionalPeriodFinalizationReadinessQuery(
    { id: annualVersion.regional_plan_version_id, region_id: regionId },
    { skip: !isOpen }
  );
  const [finalize, { isLoading: isFinalizing }] = useFinalizeRegionalPeriodTargetsMutation();

  const yearLabel = annualVersion.planning_year ?? annualVersion.year;

  const handleFinalize = async () => {
    try {
      await finalize({ id: annualVersion.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success(
        `Execution period targets finalized for Year ${yearLabel}. Period targets for this year are now locked.`
      );
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      actionFeedback.error(getApiErrorMessage(error, "Failed to finalize period targets"));
      refetch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[520px]")}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle>Finalize Execution Period</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="space-y-4 pb-4 text-sm">
            <p className="text-muted-foreground">
              Validates period targets for <strong>Year {yearLabel}</strong> only. Every weighted leaf
              node must allocate period targets that sum to its annual target for this year. Divisible KPIs
              need a share in every period; lump KPIs may place the full target in delivery period(s).
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
                <p className="text-green-700 text-xs mt-1">
                  All period targets sum up to annual targets for Year {yearLabel}.
                </p>
              </div>
            ) : (
              <div className="max-h-[min(40dvh,280px)] space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  Not ready to finalize
                </div>
                <ul className="list-disc space-y-1 break-words pl-5 pr-1 text-xs text-amber-800">
                  {(readiness?.errors ?? ["Unknown validation error"]).map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
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
              "Finalize Execution Period"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
