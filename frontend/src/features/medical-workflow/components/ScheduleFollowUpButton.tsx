"use client";

import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateFollowUpMutation,
  type CreateFollowUpPayload,
  type FollowUpPriority,
} from "@/redux/api/followUpApi";

interface Props {
  appointmentId: string;
  patientId: string;
  userId: string;
  disabled?: boolean;
}

export function ScheduleFollowUpButton({
  appointmentId,
  patientId,
  userId,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [createFollowUp, { isLoading }] = useCreateFollowUpMutation();

  const [reason, setReason] = useState("");
  const [clinicalInstructions, setClinicalInstructions] = useState("");
  const [priority, setPriority] = useState<FollowUpPriority>("NORMAL");
  const [recommendedDate, setRecommendedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [targetDate, setTargetDate] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a reason for the follow-up");
      return;
    }

    const payload: CreateFollowUpPayload = {
      patient_id: patientId,
      appointment_id: appointmentId,
      recommended_by: userId,
      reason: reason.trim(),
      clinical_instructions: clinicalInstructions.trim() || undefined,
      priority,
      recommended_date: recommendedDate,
      target_date: targetDate || undefined,
    };

    try {
      await createFollowUp(payload).unwrap();
      toast.success("Follow-up recommended successfully");
      setOpen(false);
      resetForm();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to create follow-up";
      toast.error(message);
    }
  };

  const resetForm = () => {
    setReason("");
    setClinicalInstructions("");
    setPriority("NORMAL");
    setRecommendedDate(new Date().toISOString().split("T")[0]);
    setTargetDate("");
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="mr-1.5 h-4 w-4" />
        Schedule Follow-up
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recommend Follow-up</DialogTitle>
            <DialogDescription>
              Create a follow-up recommendation for this patient. Reception will schedule the appointment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="reason">Reason for Follow-up *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Cataract post-op check, Glaucoma pressure monitoring"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="instructions">Clinical Instructions (optional)</Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Check visual acuity, measure IOP"
                value={clinicalInstructions}
                onChange={(e) => setClinicalInstructions(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v: FollowUpPriority) => setPriority(v)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="recDate">Recommended Date</Label>
                <Input
                  id="recDate"
                  type="date"
                  value={recommendedDate}
                  onChange={(e) => setRecommendedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="targetDate">Target Date (optional)</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Recommend Follow-up"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}