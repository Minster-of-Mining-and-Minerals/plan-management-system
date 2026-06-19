"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { actionFeedback } from "@/components/action-feedback";
import {
  useGetIssueByIdQuery,
  useGetIssueHistoryQuery,
  useStartIssueReviewMutation,
  useCloseIssueMutation,
} from "@/redux/api/issueApi";
import { IssueStatusBadge } from "../components/IssueStatusBadge";
import { PriorityBadge } from "./components/PriorityBadge";
import { TimelineOpener } from "./components/TimelineOpener";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { ISSUE_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { useAuth } from "@/hooks/use-auth";
import { IssueDetailOverview } from "./components/IssueDetailOverview";
import { IssueDetailRecords } from "./components/IssueDetailRecords";
import { ResolutionPreview } from "./panels/ResolutionPreview";
import { AcceptPreview } from "./panels/AcceptPreview";
import { RejectPreview } from "./panels/RejectPreview";
import { IssueHistoryLogPanel } from "./panels/IssueHistoryLogPanel";
import type { PermissionKey } from "@/lib/permissions";

type IssueAction = "accept" | "reject" | "resolve" | null;

const TERMINAL_STATUSES: string[] = ["resolved", "closed", "rejected"];

interface IssueDetailViewProps {
  issueId: string;
}

export default function IssueDetailView({ issueId }: IssueDetailViewProps) {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<IssueAction>(null);
  const [openTimeline, setOpenTimeline] = useState(false);

  const { data: issue, isLoading } = useGetIssueByIdQuery(issueId, {
    skip: !issueId,
  });
  const { data: history = [] } = useGetIssueHistoryQuery(issueId, {
    skip: !issueId,
  });

  const [startReview, { isLoading: startingReview }] = useStartIssueReviewMutation();
  const [closeIssue, { isLoading: closing }] = useCloseIssueMutation();

  const panelOpen = Boolean(selectedAction) || openTimeline;

  const isRaiser = Boolean(user?.user_id && issue?.raised_by === user.user_id);
  const canShowWorkflowActions =
    !isRaiser &&
    issue &&
    ["submitted", "under_review", "accepted", "resolved"].includes(issue.status);

  const closePanels = () => {
    setSelectedAction(null);
    setOpenTimeline(false);
  };

  const selectAction = (action: IssueAction) => {
    setOpenTimeline(false);
    setSelectedAction(action);
  };

  const handleStartReview = async () => {
    try {
      await startReview(issueId).unwrap();
      actionFeedback.success("Issue moved to under review");
    } catch (e: unknown) {
      actionFeedback.error(
        (e as { data?: { message?: string } })?.data?.message || "Failed to start review"
      );
    }
  };

  const handleClose = async () => {
    if (!(await actionFeedback.confirm("Close this issue?", { destructive: false }))) {
      return;
    }
    try {
      await closeIssue(issueId).unwrap();
      actionFeedback.success("Issue closed");
    } catch (e: unknown) {
      actionFeedback.error(
        (e as { data?: { message?: string } })?.data?.message || "Failed to close issue"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-6 text-center text-muted-foreground">Issue not found.</div>
    );
  }

  const actionButtons: {
    key: IssueAction;
    label: string;
    desc: string;
    enabled: boolean;
    permission?: PermissionKey[];
  }[] = [];

  if (issue.status === "under_review") {
    actionButtons.push(
      {
        key: "accept",
        label: "Accept issue",
        desc: "Accept this issue and optionally add review notes.",
        enabled: canShowWorkflowActions,
        permission: [ISSUE_PERMISSIONS.REVIEW],
      },
      {
        key: "reject",
        label: "Reject issue",
        desc: "Reject this issue with a required reason.",
        enabled: canShowWorkflowActions,
        permission: [ISSUE_PERMISSIONS.REVIEW],
      }
    );
  }

  if (issue.status === "accepted") {
    actionButtons.push({
      key: "resolve",
      label: "Resolve issue",
      desc: "Document how this issue was resolved.",
      enabled: canShowWorkflowActions,
      permission: [ISSUE_PERMISSIONS.RESOLVE],
    });
  }

  return (
    <div className="min-h-screen space-y-4 bg-muted/30 p-4">
      <div className="relative mx-auto min-h-[480px] w-full overflow-hidden rounded-xl border border-border bg-card p-4 shadow-md">
        <div
          className={`w-full transition-all duration-500 ease-in-out ${
            panelOpen ? "lg:pr-[360px]" : ""
          }`}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href="/issues"
                className="mb-2 flex items-center gap-1 text-sm text-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Back to issues
              </Link>
              <h1 className="font-mono text-2xl font-semibold text-foreground">
                {issue.issue_number}
              </h1>
              <p className="mt-1 text-sm text-foreground">{issue.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {issue.category?.name || "—"}
                {issue.formConfigContainer?.name
                  ? ` · ${issue.formConfigContainer.name}`
                  : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Raised by {issue.raiser?.full_name || "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <IssueStatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />

              {!openTimeline && !selectedAction ? (
                <TimelineOpener
                  onOpen={() => {
                    setSelectedAction(null);
                    setOpenTimeline(true);
                  }}
                />
              ) : null}

              {canShowWorkflowActions && issue.status === "submitted" ? (
                <PermissionGuard requireAll={[ISSUE_PERMISSIONS.REVIEW]}>
                  <Button onClick={handleStartReview} disabled={startingReview} size="sm">
                    {startingReview ? "Starting…" : "Start review"}
                  </Button>
                </PermissionGuard>
              ) : null}

              {canShowWorkflowActions && issue.status === "resolved" ? (
                <PermissionGuard requireAll={[ISSUE_PERMISSIONS.CLOSE]}>
                  <Button onClick={handleClose} disabled={closing} size="sm">
                    {closing ? "Closing…" : "Close issue"}
                  </Button>
                </PermissionGuard>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <IssueDetailOverview issue={issue} />
            <IssueDetailRecords issue={issue} />
          </div>

          {isRaiser && !TERMINAL_STATUSES.includes(issue.status) ? (
            <div className="mt-5 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              You raised this issue. Review, resolve, and close actions must be performed by
              another user.
            </div>
          ) : null}

          {!TERMINAL_STATUSES.includes(issue.status) &&
          canShowWorkflowActions &&
          actionButtons.length > 0 ? (
            <>
              <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">
                Select action
              </h3>
              <div className="flex flex-col gap-2 md:flex-row">
                {actionButtons.map((action) => {
                  const button = (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => action.enabled && selectAction(action.key)}
                      disabled={!action.enabled}
                      className={cn(
                        "relative flex-1 rounded-lg border p-3 text-left transition-all",
                        selectedAction === action.key
                          ? "border-primary bg-accent ring-1 ring-ring"
                          : action.enabled
                            ? "cursor-pointer border-border bg-card hover:bg-muted/50"
                            : "cursor-not-allowed border-border bg-muted opacity-60"
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border-2",
                            selectedAction === action.key
                              ? "border-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {selectedAction === action.key ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
                        </div>
                        <p
                          className={cn(
                            "font-semibold",
                            action.enabled ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {action.label}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-sm",
                          action.enabled ? "text-muted-foreground" : "text-muted-foreground/70"
                        )}
                      >
                        {action.desc}
                      </p>
                    </button>
                  );

                  if (action.permission) {
                    return (
                      <PermissionGuard key={action.key} requireAll={action.permission}>
                        {button}
                      </PermissionGuard>
                    );
                  }
                  return button;
                })}
              </div>
            </>
          ) : null}
        </div>

        <AnimatePresence>
          {selectedAction === "accept" ? (
            <AcceptPreview issueId={issueId} onClose={closePanels} />
          ) : null}
          {selectedAction === "reject" ? (
            <RejectPreview issueId={issueId} onClose={closePanels} />
          ) : null}
          {selectedAction === "resolve" ? (
            <ResolutionPreview issueId={issueId} onClose={closePanels} />
          ) : null}
          {openTimeline ? (
            <IssueHistoryLogPanel history={history} onClose={closePanels} />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
