"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useGetFollowUpQuery,
  useScheduleAppointmentMutation,
  useRescheduleAttemptMutation,
  useListAttemptsQuery,
} from "@/redux/api/followUpApi";
import { useGetEligibleStaffQuery } from "@/redux/api/scheduleApi";
import type { FollowUpAttempt } from "@/redux/api/followUpApi";

interface Props {
  followUpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleFollowUpDialog({
  followUpId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { data: followUp, isLoading: followUpLoading } = useGetFollowUpQuery(followUpId, {
    skip: !followUpId,
  });
  const { data: attempts } = useListAttemptsQuery(followUpId, {
    skip: !followUpId,
  });
  const { data: eligibleStaff = [] } = useGetEligibleStaffQuery();

  const [scheduleAppointment, { isLoading: scheduling }] = useScheduleAppointmentMutation();
  const [rescheduleAttempt, { isLoading: rescheduling }] = useRescheduleAttemptMutation();

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");

  const isReschedule = followUp?.status === "MISSED";
  const isSubmitting = scheduling || rescheduling;

  // Find the latest missed/cancelled attempt for rescheduling
  const latestReschedulableAttempt = Array.isArray(attempts)
    ? [...attempts].reverse().find(
        (a: FollowUpAttempt) => a.status === "MISSED" || a.status === "CANCELLED"
      )
    : undefined;

  useEffect(() => {
    if (open) {
      setSelectedStaffId("");
      setScheduleDate("");
      setStartTime("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedStaffId) {
      toast.error("Please select a provider");
      return;
    }
    if (!scheduleDate) {
      toast.error("Please select a date");
      return;
    }
    if (!startTime) {
      toast.error("Please select a time");
      return;
    }

    const payload = {
      assigned_staff_id: selectedStaffId,
      schedule_date: scheduleDate,
      start_time: startTime,
      notes: notes || undefined,
    };

    try {
      if (isReschedule && latestReschedulableAttempt) {
        await rescheduleAttempt({
          id: followUpId,
          previousAttemptId: latestReschedulableAttempt.attempt_id,
          data: payload,
        }).unwrap();
        toast.success("Follow-up rescheduled successfully");
      } else {
        await scheduleAppointment({
          id: followUpId,
          data: payload,
        }).unwrap();
        toast.success("Follow-up scheduled successfully");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to schedule follow-up";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isReschedule ? "Reschedule Follow-up" : "Schedule Follow-up"}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "Create a new appointment attempt for this missed follow-up"
              : "Schedule an appointment for this follow-up recommendation"}
          </DialogDescription>
        </DialogHeader>

        {followUpLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : followUp ? (
          <div className="space-y-4">
            {/* Follow-up Summary */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">{followUp.reason}</p>
              {followUp.clinical_instructions && (
                <p className="text-xs text-muted-foreground">
                  {followUp.clinical_instructions}
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span>Priority: {followUp.priority}</span>
                {followUp.recommender && (
                  <span>By: {followUp.recommender.full_name}</span>
                )}
                {followUp.target_date && (
                  <span>Target: {followUp.target_date}</span>
                )}
              </div>
            </div>

            {/* Attempt History Summary */}
            {attempts && attempts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Previous Attempts ({attempts.length})
                </p>
                <div className="space-y-1">
                  {attempts.map((a: FollowUpAttempt) => (
                    <div
                      key={a.attempt_id}
                      className="flex items-center justify-between rounded border px-2 py-1 text-[10px]"
                    >
                      <span>Attempt #{a.attempt_number}</span>
                      <span className={a.status === "MISSED" ? "text-destructive" : a.status === "CANCELLED" ? "text-muted-foreground" : "text-green-600"}>
                        {a.status}
                      </span>
                      {a.scheduled_date && (
                        <span className="text-muted-foreground">
                          {a.scheduled_date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule Form */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="staff">Provider</Label>
                <Select
                  value={selectedStaffId}
                  onValueChange={setSelectedStaffId}
                >
                  <SelectTrigger id="staff">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleStaff.map((staff: { user_id: string; full_name: string }) => (
                      <SelectItem key={staff.user_id} value={staff.user_id}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Additional scheduling notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Follow-up not found
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStaffId || !scheduleDate || !startTime}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isReschedule ? "Rescheduling..." : "Scheduling..."}
              </>
            ) : (
              <>{isReschedule ? "Reschedule" : "Schedule Appointment"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}