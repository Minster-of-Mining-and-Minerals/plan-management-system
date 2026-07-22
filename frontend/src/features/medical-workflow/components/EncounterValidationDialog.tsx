"use client";

import React from "react";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type {
  ValidationResult,
  ValidationIssue,
} from "@/redux/api/medicalWorkflowApi";

export type ValidationDialogState =
  | { phase: "loading" }
  | { phase: "results"; result: ValidationResult }
  | { phase: "override"; result: ValidationResult }
  | { phase: "completing" };

export interface EncounterValidationDialogProps {
  open: boolean;
  onClose: () => void;
  state: ValidationDialogState;
  overrideReason: string;
  onOverrideReasonChange: (reason: string) => void;
  onProceedAnyway: () => void;
  onConfirmCompletion: () => void;
}

function IssueCard({
  issue,
  type,
}: {
  issue: ValidationIssue;
  type: "blocking" | "warning" | "recommendation";
}) {
  const styles = {
    blocking: {
      bg: "bg-destructive/10 border-destructive/30",
      text: "text-destructive",
      badge: "destructive" as const,
      icon: AlertOctagon,
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-700/40",
      text: "text-amber-600 dark:text-amber-400",
      badge: "secondary" as const,
      icon: AlertTriangle,
    },
    recommendation: {
      bg: "bg-blue-500/10 border-blue-500/30 dark:bg-blue-950/30 dark:border-blue-700/40",
      text: "text-blue-600 dark:text-blue-400",
      badge: "outline" as const,
      icon: Info,
    },
  }[type];

  const IconComponent = styles.icon;

  return (
    <div className={`p-3.5 rounded-lg border ${styles.bg} space-y-1.5`}>
      <div className="flex items-start gap-2.5">
        <IconComponent className={`h-5 w-5 shrink-0 mt-0.5 ${styles.text}`} />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm text-foreground">
              {issue.title}
            </h4>
            <Badge variant={styles.badge} className="text-[10px] uppercase font-bold tracking-wider">
              {issue.code || issue.severity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {issue.description}
          </p>
          {issue.resolutionHint && (
            <p className="text-xs font-medium text-foreground/80 bg-background/50 p-2 rounded border border-border/50 mt-1">
              <span className="font-semibold text-primary">Resolution Hint: </span>
              {issue.resolutionHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EncounterValidationDialog({
  open,
  onClose,
  state,
  overrideReason,
  onOverrideReasonChange,
  onProceedAnyway,
  onConfirmCompletion,
}: EncounterValidationDialogProps) {
  const isInteractable = state.phase !== "loading" && state.phase !== "completing";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && isInteractable && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {state.phase === "loading" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                Validating Encounter Completion
              </DialogTitle>
              <DialogDescription>
                Checking encounter completeness and clinical safety rules...
              </DialogDescription>
            </DialogHeader>
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Evaluating validation engine parameters...</p>
            </div>
          </>
        )}

        {state.phase === "completing" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Completing Encounter
              </DialogTitle>
              <DialogDescription>
                Finalizing medical record, status updates, and audit logging...
              </DialogDescription>
            </DialogHeader>
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Saving completion state...</p>
            </div>
          </>
        )}

        {state.phase === "results" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {state.result.blockingIssues.length > 0 ? (
                  <>
                    <AlertOctagon className="h-5 w-5 text-destructive" />
                    Encounter Completion Blocked
                  </>
                ) : state.result.warnings.length > 0 ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Validation Warnings Detected
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Encounter Ready for Completion
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {state.result.blockingIssues.length > 0
                  ? "Required items or critical checks must be resolved before completing this encounter."
                  : state.result.warnings.length > 0
                  ? "Warnings were found during validation. You may review them or proceed with a clinical override."
                  : "All validation checks passed successfully. You may complete this encounter."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
              {state.result.blockingIssues.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                    <AlertOctagon className="h-4 w-4" />
                    Blocking Issues ({state.result.blockingIssues.length})
                  </h3>
                  <div className="space-y-2">
                    {state.result.blockingIssues.map((issue, idx) => (
                      <IssueCard key={issue.code || idx} issue={issue} type="blocking" />
                    ))}
                  </div>
                </div>
              )}

              {state.result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({state.result.warnings.length})
                  </h3>
                  <div className="space-y-2">
                    {state.result.warnings.map((issue, idx) => (
                      <IssueCard key={issue.code || idx} issue={issue} type="warning" />
                    ))}
                  </div>
                </div>
              )}

              {state.result.recommendations && state.result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    Recommendations ({state.result.recommendations.length})
                  </h3>
                  <div className="space-y-2">
                    {state.result.recommendations.map((issue, idx) => (
                      <IssueCard key={issue.code || idx} issue={issue} type="recommendation" />
                    ))}
                  </div>
                </div>
              )}

              {state.result.blockingIssues.length === 0 && state.result.warnings.length === 0 && (!state.result.recommendations || state.result.recommendations.length === 0) && (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto opacity-80" />
                  <p className="text-sm font-medium">All clinical and administrative rules satisfied.</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              {state.result.blockingIssues.length > 0 ? (
                <Button variant="outline" onClick={onClose}>
                  Close & Fix Issues
                </Button>
              ) : state.result.warnings.length > 0 ? (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onProceedAnyway}
                    className="gap-1.5"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Override & Complete
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={onConfirmCompletion} className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Encounter
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}

        {state.phase === "override" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Clinical Override Justification
              </DialogTitle>
              <DialogDescription>
                A clinical reason is required to bypass non-blocking validation warnings.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Overriding Warnings:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {state.result.warnings.map((w, i) => (
                    <li key={i}>
                      <span className="font-medium">{w.title}</span>: {w.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <label htmlFor="override-reason-input" className="text-xs font-semibold text-foreground">
                  Clinical Override Reason <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="override-reason-input"
                  placeholder="Provide justification (e.g., Verbal order confirmed, diagnostic exception documented, patient refused step...)"
                  value={overrideReason}
                  onChange={(e) => onOverrideReasonChange(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!overrideReason.trim()}
                onClick={onConfirmCompletion}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Override & Complete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
