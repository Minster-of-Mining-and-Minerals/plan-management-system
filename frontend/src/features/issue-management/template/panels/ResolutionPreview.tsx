"use client";

import { useState } from "react";
import { actionFeedback } from "@/components/action-feedback";
import { useResolveIssueMutation } from "@/redux/api/issueApi";
import { IssueSidePanelShell } from "../components/IssueSidePanelShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const panelTextareaClass =
  "w-full min-h-[5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

interface ResolutionPreviewProps {
  issueId: string;
  onClose?: () => void;
}

export function ResolutionPreview({ issueId, onClose }: ResolutionPreviewProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveIssue, { isLoading }] = useResolveIssueMutation();

  const handleSubmit = async () => {
    try {
      await resolveIssue({
        id: issueId,
        resolution_notes: resolutionNotes || undefined,
      }).unwrap();
      actionFeedback.success("Issue resolved");
      setResolutionNotes("");
      onClose?.();
    } catch (e: unknown) {
      actionFeedback.error(
        (e as { data?: { message?: string } })?.data?.message || "Failed to resolve issue"
      );
    }
  };

  return (
    <IssueSidePanelShell
      title="Resolve issue"
      subtitle="Document how this issue was resolved"
      onClose={onClose}
    >
      <div className="space-y-2">
        <Label>Resolution notes (optional)</Label>
        <textarea
          className={cn(panelTextareaClass, "min-h-28")}
          placeholder="Explain how this issue was resolved"
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
        />
      </div>
      <div className="mt-2 flex w-full justify-end gap-3 pb-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Submitting…" : "Confirm resolve"}
        </Button>
      </div>
    </IssueSidePanelShell>
  );
}
