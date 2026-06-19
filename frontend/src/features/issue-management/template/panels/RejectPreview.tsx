"use client";

import { useState } from "react";
import { actionFeedback } from "@/components/action-feedback";
import { useRejectIssueMutation } from "@/redux/api/issueApi";
import { IssueSidePanelShell } from "../components/IssueSidePanelShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const panelTextareaClass =
  "w-full min-h-[5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

interface RejectPreviewProps {
  issueId: string;
  onClose?: () => void;
}

export function RejectPreview({ issueId, onClose }: RejectPreviewProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectIssue, { isLoading }] = useRejectIssueMutation();

  const handleSubmit = async () => {
    if (!rejectionReason.trim()) {
      actionFeedback.error("Rejection reason is required");
      return;
    }
    try {
      await rejectIssue({ id: issueId, rejection_reason: rejectionReason }).unwrap();
      actionFeedback.success("Issue rejected");
      setRejectionReason("");
      onClose?.();
    } catch (e: unknown) {
      actionFeedback.error(
        (e as { data?: { message?: string } })?.data?.message || "Failed to reject issue"
      );
    }
  };

  return (
    <IssueSidePanelShell
      title="Reject issue"
      subtitle="Provide a reason for rejecting this issue"
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label>Rejection reason</Label>
        <textarea
          className={cn(panelTextareaClass, "min-h-28")}
          placeholder="Explain why this issue is being rejected"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </div>
      <div className="mt-2 flex w-full justify-end gap-3 pb-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Submitting…" : "Confirm reject"}
        </Button>
      </div>
    </IssueSidePanelShell>
  );
}
