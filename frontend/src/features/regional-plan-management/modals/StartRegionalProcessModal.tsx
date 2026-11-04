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
import { Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import {
  useGetRegionalStartProcessReadinessQuery,
  useStartRegionalPlanProcessMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

interface StartRegionalProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVersion: RegionalPlanVersion;
  regionId: string;
  onSuccess?: () => void;
}

export function StartRegionalProcessModal({
  isOpen,
  onClose,
  masterVersion,
  regionId,
  onSuccess,
}: StartRegionalProcessModalProps) {
  const { data: readiness, isLoading, refetch } = useGetRegionalStartProcessReadinessQuery(
    { id: masterVersion.regional_plan_version_id, region_id: regionId },
    { skip: !isOpen }
  );
  const [startProcess, { isLoading: isStarting }] = useStartRegionalPlanProcessMutation();

  const handleStart = async () => {
    try {
      await startProcess({ id: masterVersion.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success("Regional plan execution process started successfully! Operational reporting is active.");
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      actionFeedback.error(getApiErrorMessage(error, "Failed to start process"));
      refetch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[520px]")}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle>Start Operational Process</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="space-y-4 pb-4 text-sm">
            <p className="text-muted-foreground">
              Freezes regional planning targets and opens the first execution cycle (Year 1, Period 1)
              for operational execution and achievement reporting. Later periods and years will remain locked
              until their predecessor period completes.
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
                <p className="text-green-700 text-xs mt-1">
                  All strategic, annual, and execution period targets have been validated and finalized.
                </p>
              </div>
            ) : (
              <div className="max-h-[min(40dvh,280px)] space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  Not ready to start process
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
          <Button variant="outline" onClick={onClose} disabled={isStarting}>
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!readiness?.ready || isStarting || isLoading}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

