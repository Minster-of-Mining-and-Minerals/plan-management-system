"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { actionFeedback } from "@/components/action-feedback";
import {
  useGetIssueByIdQuery,
  useGetIssueHistoryQuery,
  useStartIssueReviewMutation,
  useAcceptIssueMutation,
  useRejectIssueMutation,
  useResolveIssueMutation,
  useCloseIssueMutation,
} from "@/redux/api/issueApi";
import { ISSUE_ENTITY_TYPE_LABELS } from "@/redux/types/issue";
import { IssueStatusBadge } from "./components/IssueStatusBadge";
import { IssueFormResponsesDisplay } from "./components/IssueFormResponsesDisplay";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { ISSUE_PERMISSIONS } from "@/utils/issuePermissionUtils";

interface IssueDetailViewProps {
  issueId: string;
}

export default function IssueDetailView({ issueId }: IssueDetailViewProps) {
  const router = useRouter();
  const { data: issue, isLoading, refetch } = useGetIssueByIdQuery(issueId);
  const { data: history = [], refetch: refetchHistory } = useGetIssueHistoryQuery(issueId);

  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [startReview, { isLoading: startingReview }] = useStartIssueReviewMutation();
  const [acceptIssue, { isLoading: accepting }] = useAcceptIssueMutation();
  const [rejectIssue, { isLoading: rejecting }] = useRejectIssueMutation();
  const [resolveIssue, { isLoading: resolving }] = useResolveIssueMutation();
  const [closeIssue, { isLoading: closing }] = useCloseIssueMutation();

  const refresh = () => {
    refetch();
    refetchHistory();
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

  const handleStartReview = async () => {
    try {
      await startReview(issueId).unwrap();
      actionFeedback.success("Issue moved to under review");
      refresh();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to start review");
    }
  };

  const handleAccept = async () => {
    try {
      await acceptIssue({ id: issueId, review_notes: reviewNotes }).unwrap();
      actionFeedback.success("Issue accepted");
      setReviewNotes("");
      refresh();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to accept issue");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      actionFeedback.error("Rejection reason is required");
      return;
    }
    try {
      await rejectIssue({ id: issueId, rejection_reason: rejectionReason }).unwrap();
      actionFeedback.success("Issue rejected");
      setRejectionReason("");
      refresh();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to reject issue");
    }
  };

  const handleResolve = async () => {
    try {
      await resolveIssue({ id: issueId, resolution_notes: resolutionNotes }).unwrap();
      actionFeedback.success("Issue resolved");
      setResolutionNotes("");
      refresh();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to resolve issue");
    }
  };

  const handleClose = async () => {
    if (
      !(await actionFeedback.confirm("Close this issue?", { destructive: false }))
    ) {
      return;
    }
    try {
      await closeIssue(issueId).unwrap();
      actionFeedback.success("Issue closed");
      refresh();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to close issue");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/issues")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground font-mono">{issue.issue_number}</p>
          <h1 className="text-xl font-semibold text-[#073954]">{issue.title}</h1>
        </div>
        <div className="ml-auto">
          <IssueStatusBadge status={issue.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{issue.description}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Justification</p>
                <p className="mt-1 whitespace-pre-wrap">{issue.justification}</p>
              </div>
              {(issue.current_value || issue.suggested_value) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Current Value</p>
                    <p className="mt-1 whitespace-pre-wrap">{issue.current_value || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Suggested Value</p>
                    <p className="mt-1 whitespace-pre-wrap">{issue.suggested_value || "—"}</p>
                  </div>
                </div>
              )}
              {issue.formConfigContainer ? (
                <div>
                  <p className="text-muted-foreground">Form Container</p>
                  <p className="mt-1">{issue.formConfigContainer.name}</p>
                </div>
              ) : null}
              {issue.formResponses && issue.formResponses.length > 0 && (
                <IssueFormResponsesDisplay
                  responses={issue.formResponses}
                  attachments={issue.attachments}
                />
              )}
              {issue.response && (
                <div>
                  <p className="text-muted-foreground">Review Response</p>
                  <p className="mt-1 whitespace-pre-wrap">{issue.response}</p>
                </div>
              )}
              {issue.rejection_reason && (
                <div>
                  <p className="text-muted-foreground">Rejection Reason</p>
                  <p className="mt-1 whitespace-pre-wrap text-red-700">{issue.rejection_reason}</p>
                </div>
              )}
              {issue.resolution_notes && (
                <div>
                  <p className="text-muted-foreground">Resolution Notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{issue.resolution_notes}</p>
                </div>
              )}
              {issue.attachment_path && (
                <div>
                  <p className="text-muted-foreground">Attachment</p>
                  <p className="mt-1 break-all">{issue.attachment_path}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li
                      key={entry.issue_history_id}
                      className="border-l-2 border-gray-200 pl-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium capitalize">
                          {entry.action_type.replace(/_/g, " ")}
                          {entry.field_name ? ` (${entry.field_name})` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}
                        </span>
                      </div>
                      {entry.performer && (
                        <p className="text-xs text-muted-foreground">
                          by {entry.performer.full_name}
                        </p>
                      )}
                      {(entry.old_value || entry.new_value) && (
                        <p className="text-xs mt-1">
                          {entry.old_value && (
                            <span className="text-red-600 line-through mr-2">
                              {entry.old_value}
                            </span>
                          )}
                          {entry.new_value && (
                            <span className="text-emerald-700">{entry.new_value}</span>
                          )}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-xs mt-1 text-muted-foreground">{entry.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Category</p>
                <p>{issue.category?.name || "—"}</p>
                {issue.category?.parent?.name ? (
                  <p className="text-xs text-muted-foreground">
                    Area: {issue.category.parent.name}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-muted-foreground">Priority</p>
                <p style={{ color: issue.priority?.color_hex || undefined }}>
                  {issue.priority?.label || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Related Entity</p>
                <p>
                  {ISSUE_ENTITY_TYPE_LABELS[issue.entity_type]} —{" "}
                  <span className="font-mono text-xs">{issue.entity_id}</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Raised By</p>
                <p>{issue.raiser?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned To</p>
                <p>{issue.assignee?.full_name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{format(new Date(issue.created_at), "dd MMM yyyy HH:mm")}</p>
              </div>
              {issue.resolved_at && (
                <div>
                  <p className="text-muted-foreground">Resolved</p>
                  <p>{format(new Date(issue.resolved_at), "dd MMM yyyy HH:mm")}</p>
                </div>
              )}
              {issue.closed_at && (
                <div>
                  <p className="text-muted-foreground">Closed</p>
                  <p>{format(new Date(issue.closed_at), "dd MMM yyyy HH:mm")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issue.status === "submitted" && (
                <PermissionGuard requireAll={[ISSUE_PERMISSIONS.REVIEW]}>
                  <Button
                    className="w-full"
                    onClick={handleStartReview}
                    disabled={startingReview}
                  >
                    Start Review
                  </Button>
                </PermissionGuard>
              )}

              {issue.status === "under_review" && (
                <>
                  <PermissionGuard requireAll={[ISSUE_PERMISSIONS.REVIEW]}>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Review notes (optional)"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                      />
                      <Button
                        className="w-full"
                        onClick={handleAccept}
                        disabled={accepting}
                      >
                        Accept Issue
                      </Button>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        placeholder="Rejection reason (required)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleReject}
                        disabled={rejecting}
                      >
                        Reject Issue
                      </Button>
                    </div>
                  </PermissionGuard>
                </>
              )}

              {issue.status === "accepted" && (
                <PermissionGuard requireAll={[ISSUE_PERMISSIONS.RESOLVE]}>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Resolution notes (optional)"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                    />
                    <Button
                      className="w-full"
                      onClick={handleResolve}
                      disabled={resolving}
                    >
                      Resolve Issue
                    </Button>
                  </div>
                </PermissionGuard>
              )}

              {issue.status === "resolved" && (
                <PermissionGuard requireAll={[ISSUE_PERMISSIONS.CLOSE]}>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClose}
                    disabled={closing}
                  >
                    Close Issue
                  </Button>
                </PermissionGuard>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
