"use client";

import { ArrowLeft, Send, Pill, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineOpener } from "./TimelineOpener";

type Props = {
  disabled?: boolean;
  historyOpen?: boolean;
  onBack: () => void;
  onForward: () => void;
  onPrescribe: () => void;
  onComplete: () => void;
  onOpenHistory: () => void;
};

export function GlobalWorkflowActions({
  disabled,
  historyOpen,
  onBack,
  onForward,
  onPrescribe,
  onComplete,
  onOpenHistory,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to appointments
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={onForward}
      >
        <Send className="mr-1.5 h-4 w-4" />
        Forward to staff
      </Button>
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
      {!historyOpen && <TimelineOpener onOpen={onOpenHistory} />}
    </div>
  );
}
