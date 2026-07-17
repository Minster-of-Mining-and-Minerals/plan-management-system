"use client";

import { PlusCircle } from "lucide-react";
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
import { KpiAdditionForm } from "./KpiAdditionForm";

type KpiAdditionRequestModalProps = {
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

export function KpiAdditionRequestModal({
  open,
  onOpenChange,
  draftId,
  annualVersionId,
}: KpiAdditionRequestModalProps) {
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
        className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[800px]")}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add KPI Addition
          </DialogTitle>
        </DialogHeader>
        <div className={cn(DIALOG_SCROLLABLE_BODY, "px-6 pb-6 space-y-3")}>
          <p className="text-sm text-muted-foreground">
            Add a new KPI to the live master plan after execution has started.
            Period targets are allocated across open periods from the start
            period through the end of the year (or selected end period).
          </p>
          {open ? (
            <KpiAdditionForm
              draftId={liveDraftId}
              annualVersionId={liveAnnualVersionId}
              onSubmitted={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
