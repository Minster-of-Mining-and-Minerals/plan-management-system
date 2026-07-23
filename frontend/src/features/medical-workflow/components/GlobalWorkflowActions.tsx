"use client";

import { ArrowLeft, Send, Pill, CheckCircle2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import { TimelineOpener } from "./TimelineOpener";
import { WORKFLOW_PERMISSIONS } from "../workflowPermissions";

type Props = {
  disabled?: boolean;
  historyOpen?: boolean;
  onBack: () => void;
  onForward: () => void;
  onPrescribe: () => void;
  onComplete: () => void;
  onOpenHistory: () => void;
  onScheduleFollowUp?: () => void;
};

export function GlobalWorkflowActions({
  disabled,
  historyOpen,
  onBack,
  onForward,
  onPrescribe,
  onComplete,
  onOpenHistory,
  onScheduleFollowUp,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to appointments
      </Button>

      <PermissionGuard requireAll={[WORKFLOW_PERMISSIONS.FORWARD]} fallback={null}>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={onForward}
        >
          <Send className="mr-1.5 h-4 w-4" />
          Forward to staff
        </Button>
      </PermissionGuard>

      <PermissionGuard requireAll={[WORKFLOW_PERMISSIONS.PRESCRIBE]} fallback={null}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onPrescribe}
        >
          <Pill className="mr-1.5 h-4 w-4" />
          Prescription
        </Button>
      </PermissionGuard>

      {onScheduleFollowUp && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={onScheduleFollowUp}
        >
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          Schedule Follow-up
        </Button>
      )}

      <PermissionGuard requireAll={[WORKFLOW_PERMISSIONS.COMPLETE]} fallback={null}>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={onComplete}
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Complete workflow
        </Button>
      </PermissionGuard>

      {!historyOpen && (
        <PermissionGuard requireAll={[WORKFLOW_PERMISSIONS.READ]} fallback={null}>
          <TimelineOpener onOpen={onOpenHistory} />
        </PermissionGuard>
      )}
    </div>
  );
}
