"use client";

import { useState } from "react";
import { actionFeedback } from "@/components/action-feedback";
import { useAcceptIssueMutation } from "@/redux/api/issueApi";
import { IssueSidePanelShell } from "../components/IssueSidePanelShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const panelTextareaClass =
  "w-full min-h-[5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

interface AcceptPreviewProps {
  issueId: string;
  onClose?: () => void;
}

export function AcceptPreview({ issueId, onClose }: AcceptPreviewProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [acceptIssue, { isLoading }] = useAcceptIssueMutation();

  const handleSubmit = async () => {
    try {
      await acceptIssue({ id: issueId, review_notes: reviewNotes || undefined }).unwrap();
      actionFeedback.success("Issue accepted");
      setReviewNotes("");
      onClose?.();
    } catch (e: unknown) {
      actionFeedback.error(
        (e as { data?: { message?: string } })?.data?.message || "Failed to accept issue"
      );
    }
  };

  return (
    <IssueSidePanelShell
      title="Accept issue"
      subtitle="Confirm acceptance and add optional review notes"
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label>Review notes (optional)</Label>
        <textarea
          className={cn(panelTextareaClass, "min-h-28")}
          placeholder="Add notes about your review decision"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      </div>
      <div className="mt-2 flex w-full justify-end gap-3 pb-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Submitting…" : "Confirm accept"}
        </Button>
      </div>
    </IssueSidePanelShell>
  );
}
