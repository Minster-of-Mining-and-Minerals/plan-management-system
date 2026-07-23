"use client";

import { Calendar, Clock, User2, Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useGetFollowUpQuery, useListAttemptsQuery } from "@/redux/api/followUpApi";
import type { FollowUpAttempt, FollowUpRecord } from "@/redux/api/followUpApi";

interface Props {
  followUpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  RECOMMENDED: "Pending Scheduling",
  PENDING_SCHEDULING: "Pending Scheduling",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  MISSED: "Missed",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  RECOMMENDED: "secondary",
  PENDING_SCHEDULING: "secondary",
  SCHEDULED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  EXPIRED: "outline",
  MISSED: "destructive",
};

const ATTEMPT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  ATTENDED: "outline",
  CANCELLED: "destructive",
  MISSED: "destructive",
};

export function FollowUpHistoryPanel({ followUpId, open, onOpenChange }: Props) {
  const { data: followUp, isLoading: followUpLoading } = useGetFollowUpQuery(followUpId, {
    skip: !followUpId,
  });
  const { data: attempts = [], isLoading: attemptsLoading } = useListAttemptsQuery(followUpId, {
    skip: !followUpId,
  });

  const isLoading = followUpLoading || attemptsLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Follow-up History</SheetTitle>
          <SheetDescription>
            Complete scheduling history for this follow-up
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : followUp ? (
          <div className="space-y-6">
            {/* Follow-up Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Follow-up Details</h3>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{followUp.reason}</p>
                  <Badge variant={STATUS_VARIANTS[followUp.status]}>
                    {STATUS_LABELS[followUp.status] ?? followUp.status}
                  </Badge>
                </div>

                {followUp.clinical_instructions && (
                  <p className="text-xs text-muted-foreground">
                    {followUp.clinical_instructions}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Priority:</span>{" "}
                    <span>{followUp.priority}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span>{followUp.status}</span>
                  </div>
                  {followUp.recommender && (
                    <div>
                      <span className="text-muted-foreground">Recommended by:</span>{" "}
                      <span>{followUp.recommender.full_name}</span>
                    </div>
                  )}
                  {followUp.recommended_date && (
                    <div>
                      <span className="text-muted-foreground">Recommended:</span>{" "}
                      <span>{followUp.recommended_date}</span>
                    </div>
                  )}
                  {followUp.target_date && (
                    <div>
                      <span className="text-muted-foreground">Target date:</span>{" "}
                      <span>{followUp.target_date}</span>
                    </div>
                  )}
                  {followUp.assignedDepartment && (
                    <div>
                      <span className="text-muted-foreground">Department:</span>{" "}
                      <span>{followUp.assignedDepartment.name}</span>
                    </div>
                  )}
                  {followUp.assignedUser && (
                    <div>
                      <span className="text-muted-foreground">Assigned to:</span>{" "}
                      <span>{followUp.assignedUser.full_name}</span>
                    </div>
                  )}
                </div>

                {followUp.cancel_reason && (
                  <div className="rounded bg-destructive/10 p-2 text-xs">
                    <span className="font-medium text-destructive">Cancel reason:</span>{" "}
                    {followUp.cancel_reason}
                  </div>
                )}
              </div>
            </div>

            {/* Attempt Tracking (Timeline) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Scheduling History ({attempts.length} attempts)
              </h3>

              {attempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                  <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No scheduling attempts yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This follow-up is awaiting scheduling
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Timeline Header - Original Recommendation */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="w-px flex-1 bg-border" />
                    </div>
                    <div className="pb-3 flex-1">
                      <p className="text-sm font-medium">Follow-up Recommended</p>
                      <p className="text-xs text-muted-foreground">
                        {followUp.recommender?.full_name ?? "Clinician"} recommended:{" "}
                        {followUp.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {followUp.recommended_date}
                      </p>
                    </div>
                  </div>

                  {/* Attempt Timeline */}
                  {attempts.map((attempt: FollowUpAttempt, index: number) => (
                    <div key={attempt.attempt_id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            attempt.status === "ATTENDED"
                              ? "bg-green-100"
                              : attempt.status === "MISSED"
                              ? "bg-red-100"
                              : attempt.status === "CANCELLED"
                              ? "bg-gray-100"
                              : "bg-blue-100"
                          }`}
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${
                              attempt.status === "ATTENDED"
                                ? "bg-green-600"
                                : attempt.status === "MISSED"
                                ? "bg-red-600"
                                : attempt.status === "CANCELLED"
                                ? "bg-gray-400"
                                : "bg-blue-600"
                            }`}
                          />
                        </div>
                        {index < attempts.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-3 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            Attempt #{attempt.attempt_number}
                          </p>
                          <Badge
                            variant={ATTEMPT_STATUS_VARIANTS[attempt.status] ?? "outline"}
                            className="text-[10px]"
                          >
                            {attempt.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {attempt.schedule && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {attempt.schedule.schedule_date} at{" "}
                                {attempt.schedule.start_time}
                              </span>
                              {attempt.schedule.staff && (
                                <span>with {attempt.schedule.staff.full_name}</span>
                              )}
                            </div>
                          )}
                          {attempt.scheduled_at && (
                            <p>Scheduled at: {new Date(attempt.scheduled_at).toLocaleString()}</p>
                          )}
                          {attempt.attended_at && (
                            <p className="text-green-600">
                              Attended: {new Date(attempt.attended_at).toLocaleString()}
                            </p>
                          )}
                          {attempt.cancelled_at && (
                            <p>
                              Cancelled: {new Date(attempt.cancelled_at).toLocaleString()}
                            </p>
                          )}
                          {attempt.cancel_reason && (
                            <p>Cancel reason: {attempt.cancel_reason}</p>
                          )}
                          {attempt.missed_reason && (
                            <p className="text-destructive">
                              Missed reason: {attempt.missed_reason}
                            </p>
                          )}
                          {attempt.scheduler && (
                            <p>Scheduled by: {attempt.scheduler.full_name}</p>
                          )}
                          {attempt.notes && <p>Notes: {attempt.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Timeline Footer - Completion */}
                  {followUp.status === "COMPLETED" && followUp.completedEncounter && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                          <div className="h-2 w-2 rounded-full bg-green-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600">
                          Follow-up Completed
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed at encounter:{" "}
                          {followUp.completedEncounter.appointment_id}
                        </p>
                        {followUp.completion_notes && (
                          <p className="text-xs text-muted-foreground">
                            Notes: {followUp.completion_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Follow-up not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}