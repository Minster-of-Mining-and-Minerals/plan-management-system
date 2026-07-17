"use client";

import { CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DIALOG_SCROLLABLE_BODY,
  DIALOG_SCROLLABLE_CONTENT,
} from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";
import type { PlanVersion } from "@/redux/types/plan";
import { ExecutionWindowReopeningForm } from "./ExecutionWindowReopeningForm";

type ExecutionWindowReopeningRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId: string;
  annualVersionId: string;
};

function resolveLiveVersionId(
  version: PlanVersion | null | undefined,
  fallbackId: string
): string {
  return version?.execution_snapshot_of_version_id || fallbackId;
}

export function ExecutionWindowReopeningRequestModal({
  open,
  onOpenChange,
  draftId,
  annualVersionId,
}: ExecutionWindowReopeningRequestModalProps) {
  const { data: draftVersion } = useGetPlanVersionByIdQuery(draftId, {
    skip: !open || !draftId,
  });
  const liveDraftId =
    draftVersion?.live_master_version_id ||
    draftVersion?.execution_snapshot_of_version_id ||
    draftId;

  const { data: annualVersion } = useGetPlanVersionByIdQuery(annualVersionId, {
    skip: !open || !annualVersionId,
  });
  const liveAnnualVersionId = resolveLiveVersionId(
    annualVersion,
    annualVersionId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[720px]")}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Add Execution Window Reopening
          </DialogTitle>
        </DialogHeader>
        <div className={cn(DIALOG_SCROLLABLE_BODY, "px-6 pb-6 space-y-3")}>
          <p className="text-sm text-muted-foreground">
            Temporarily reopen closed execution periods so actuals can be edited
            within a bounded window. Period completion status stays unchanged.
          </p>
          <ExecutionWindowReopeningForm
            draftId={liveDraftId}
            annualVersionId={liveAnnualVersionId}
            onSubmitted={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
