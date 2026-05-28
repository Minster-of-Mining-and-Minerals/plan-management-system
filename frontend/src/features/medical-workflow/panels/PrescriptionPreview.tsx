"use client";

import { AppointmentSidePanelShell } from "../components/AppointmentSidePanelShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
const panelTextareaClass =
  "w-full min-h-[5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

type Props = {
  patientName?: string;
  onClose?: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

export function PrescriptionPreview({
  patientName,
  onClose,
  onConfirm,
  isSubmitting,
}: Props) {
  return (
    <AppointmentSidePanelShell
      title="Prescription preview"
      subtitle={
        patientName
          ? `Review and confirm prescription for ${patientName}`
          : "Review and confirm prescription"
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Confirm prescription"}
          </Button>
        </div>
      }
    >
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="font-semibold text-foreground">Before you submit</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
          <li>Uses configured form fields when a workflow draft is open</li>
          <li>Otherwise records a prescription entry for this appointment</li>
          <li>You can forward the patient to another staff member afterward</li>
        </ul>
      </div>

      <div className="space-y-2">
        <Label>Summary</Label>
        <p className={cn(panelTextareaClass, "min-h-24 bg-muted/30 text-muted-foreground")}>
          Confirm to record this prescription in the patient medical history. You
          can forward the patient to another staff member afterward if needed.
        </p>
      </div>

    </AppointmentSidePanelShell>
  );
}
