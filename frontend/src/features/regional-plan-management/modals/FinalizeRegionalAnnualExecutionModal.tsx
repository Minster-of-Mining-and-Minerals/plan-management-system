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
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import {
  useFinalizeRegionalAnnualExecutionMutation,
  useGetRegionalAnnualExecutionReadinessQuery,
  useDistributeRegionalAnnualTargetsEquallyMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

interface FinalizeRegionalAnnualExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVersion: RegionalPlanVersion;
  regionId: string;
  onSuccess?: () => void;
}

export function FinalizeRegionalAnnualExecutionModal({
  isOpen,
  onClose,
  masterVersion,
  regionId,
  onSuccess,
}: FinalizeRegionalAnnualExecutionModalProps) {
  const { data: readiness, isLoading, refetch } = useGetRegionalAnnualExecutionReadinessQuery(
    { id: masterVersion.regional_plan_version_id, region_id: regionId },
    { skip: !isOpen }
  );
  const [finalize, { isLoading: isFinalizing }] = useFinalizeRegionalAnnualExecutionMutation();
  const [distributeAnnualEqually, { isLoading: isDistributing }] =
    useDistributeRegionalAnnualTargetsEquallyMutation();

  const handleAutoDistribute = async () => {
    try {
      await distributeAnnualEqually({
        id: masterVersion.regional_plan_version_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Annual targets divided equally across years. Re-validating...");
      refetch();
    } catch (error: unknown) {
      actionFeedback.error(getApiErrorMessage(error, "Failed to distribute annual targets"));
    }
  };

  const handleFinalize = async () => {
    try {
      await finalize({ id: masterVersion.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success(
        "Annual execution finalized. You can now initialize execution periods from the Annual Execution tab."
      );
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      actionFeedback.error(getApiErrorMessage(error, "Failed to finalize annual execution"));
      refetch();
    }
  };

  const planningYears = readiness?.planning_years ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[520px]")}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle>Finalize Annual Execution</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="space-y-4 pb-4 text-sm">
            <p className="text-muted-foreground">
              Validates that every weighted regional plan node has annual targets configured across all
              planning years, each greater than zero, and that the sum of annual targets across years
              matches the strategic draft target exactly. After finalization, you can initialize
              execution periods across all years.
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
                  Ready to finalize annual execution
                </div>
                {planningYears.length > 0 && (
                  <p className="text-green-700 text-xs break-words">
                    Years validated: {planningYears.join(", ")}
                  </p>
                )}
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
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100 text-xs shadow-xs"
                    onClick={handleAutoDistribute}
                    disabled={isDistributing}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    {isDistributing ? "Auto-dividing..." : "Auto-Divide Targets Equally"}
                  </Button>
                </div>
              </div>
            )}

            {planningYears.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {planningYears.map((year: number, idx: number) => (
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
              "Finalize Annual Execution"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

