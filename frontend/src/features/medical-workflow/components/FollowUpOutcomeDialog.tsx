"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { FollowUpOutcomeStatus, CreateOutcomePayload } from "@/redux/api/followUpApi";

const OUTCOME_OPTIONS: { value: FollowUpOutcomeStatus; label: string }[] = [
  { value: "RESOLVED", label: "Resolved" },
  { value: "IMPROVED", label: "Improved" },
  { value: "STABLE", label: "Stable" },
  { value: "WORSENED", label: "Worsened" },
  { value: "REFERRED", label: "Referred" },
  { value: "LOST_TO_FOLLOW_UP", label: "Lost to Follow-up" },
  { value: "PATIENT_DECLINED", label: "Patient Declined" },
  { value: "OTHER", label: "Other" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  onSubmit: (data: CreateOutcomePayload) => Promise<void>;
  initialData?: CreateOutcomePayload;
};

export function FollowUpOutcomeDialog({
  open,
  onClose,
  encounterId,
  onSubmit,
  initialData,
}: Props) {
  const [outcomeStatus, setOutcomeStatus] = useState<FollowUpOutcomeStatus>(
    initialData?.outcome_status || "IMPROVED"
  );
  const [treatmentResponse, setTreatmentResponse] = useState(
    initialData?.treatment_response || ""
  );
  const [resolutionNotes, setResolutionNotes] = useState(
    initialData?.resolution_notes || ""
  );
  const [requiresAdditional, setRequiresAdditional] = useState(
    initialData?.requires_additional_follow_up || false
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!outcomeStatus) {
      toast.error("Please select an outcome status");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        encounter_id: encounterId,
        outcome_status: outcomeStatus,
        treatment_response: treatmentResponse.trim() || undefined,
        resolution_notes: resolutionNotes.trim() || undefined,
        requires_additional_follow_up: requiresAdditional,
      });
      toast.success("Follow-up outcome recorded");
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "data" in e
        ? String((e as { data?: { message?: string } }).data?.message)
        : "Failed to record outcome";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Follow-up Outcome</DialogTitle>
          <DialogDescription>
            Document the clinical outcome of this follow-up encounter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="outcome-status">Clinical Status *</Label>
            <Select
              value={outcomeStatus}
              onValueChange={(v) => setOutcomeStatus(v as FollowUpOutcomeStatus)}
            >
              <SelectTrigger id="outcome-status">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment-response">Treatment Response</Label>
            <Textarea
              id="treatment-response"
              placeholder="How did the patient respond to treatment?"
              value={treatmentResponse}
              onChange={(e) => setTreatmentResponse(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution-notes">Resolution Notes</Label>
            <Textarea
              id="resolution-notes"
              placeholder="Detailed clinical notes about the outcome..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="requires-additional"
              checked={requiresAdditional}
              onCheckedChange={setRequiresAdditional}
            />
            <Label htmlFor="requires-additional" className="cursor-pointer">
              Requires additional follow-up
            </Label>
          </div>

          {requiresAdditional && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              After saving, you will be able to create the next follow-up in the chain.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Outcome"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}