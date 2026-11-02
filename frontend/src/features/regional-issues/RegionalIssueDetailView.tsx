"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RegionalIssue,
  RegionalIssueStatus,
} from "@/redux/types/regionalIssue";
import {
  RegionalIssueStatusBadge,
  RegionalEscalationStatusBadge,
} from "./RegionalIssueStatusBadge";
import {
  useStartRegionalIssueReviewMutation,
  useAcceptRegionalIssueMutation,
  useRejectRegionalIssueMutation,
  useResolveRegionalIssueMutation,
  useCloseRegionalIssueMutation,
  useAddRegionalIssueCommentMutation,
} from "@/redux/api/regionalIssueApi";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ShieldCheck,
  Send,
  MessageSquare,
  History,
  AlertTriangle,
  Building2,
  User,
  Calendar,
  Lock,
  ArrowUpRight,
  Paperclip,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { RegionalEscalateIssueModal } from "./RegionalEscalateIssueModal";
import { RegionalEscalationTrackingCard } from "./RegionalEscalationTrackingCard";

interface RegionalIssueDetailViewProps {
  regionId: string;
  issue: RegionalIssue;
  onRefresh?: () => void;
  onOpenEscalateModal?: () => void;
}

export function RegionalIssueDetailView({
  regionId,
  issue,
  onRefresh,
  onOpenEscalateModal,
}: RegionalIssueDetailViewProps) {
  const router = useRouter();
  const { user, hasRole, hasAnyPermission } = useAuth();
  const currentUserId = user?.user_id;

  const isRaiser = String(issue.raised_by) === String(currentUserId);
  const isSuperAdmin = hasRole("Super Admin");

  const canReview = isSuperAdmin || hasAnyPermission("REGIONAL_ISSUES:REVIEW", "REGIONAL_ISSUES:MANAGE");
  const canResolve = isSuperAdmin || hasAnyPermission("REGIONAL_ISSUES:RESOLVE", "REGIONAL_ISSUES:MANAGE");
  const canClose = isSuperAdmin || hasAnyPermission("REGIONAL_ISSUES:CLOSE", "REGIONAL_ISSUES:MANAGE");
  const canComment = isSuperAdmin || hasAnyPermission("REGIONAL_ISSUES:COMMENT", "REGIONAL_ISSUES:MANAGE");
  const canEscalate = isSuperAdmin || hasAnyPermission("REGIONAL_ISSUES:ESCALATE", "REGIONAL_ISSUES:MANAGE");

  // RTK Mutations
  const [startReview, { isLoading: isStartingReview }] = useStartRegionalIssueReviewMutation();
  const [acceptIssue, { isLoading: isAccepting }] = useAcceptRegionalIssueMutation();
  const [rejectIssue, { isLoading: isRejecting }] = useRejectRegionalIssueMutation();
  const [resolveIssue, { isLoading: isResolving }] = useResolveRegionalIssueMutation();
  const [closeIssue, { isLoading: isClosing }] = useCloseRegionalIssueMutation();
  const [addComment, { isLoading: isCommenting }] = useAddRegionalIssueCommentMutation();

  // Dialog states
  const [dialogType, setDialogType] = useState<"accept" | "reject" | "resolve" | "close" | null>(null);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleStartReview = async () => {
    try {
      setErrorMsg("");
      await startReview({ regionId, issueId: issue.regional_issue_id }).unwrap();
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to start review.");
    }
  };

  const handleAccept = async () => {
    try {
      setErrorMsg("");
      await acceptIssue({
        regionId,
        issueId: issue.regional_issue_id,
        response: responseNotes,
      }).unwrap();
      setDialogType(null);
      setResponseNotes("");
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to accept issue.");
    }
  };

  const handleReject = async () => {
    if (!responseNotes.trim()) {
      setErrorMsg("Rejection reason is required.");
      return;
    }
    try {
      setErrorMsg("");
      await rejectIssue({
        regionId,
        issueId: issue.regional_issue_id,
        rejection_reason: responseNotes,
      }).unwrap();
      setDialogType(null);
      setResponseNotes("");
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to reject issue.");
    }
  };

  const handleResolve = async () => {
    if (!responseNotes.trim()) {
      setErrorMsg("Resolution notes are required.");
      return;
    }
    try {
      setErrorMsg("");
      await resolveIssue({
        regionId,
        issueId: issue.regional_issue_id,
        resolution_notes: responseNotes,
      }).unwrap();
      setDialogType(null);
      setResponseNotes("");
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to resolve issue.");
    }
  };

  const handleClose = async () => {
    try {
      setErrorMsg("");
      await closeIssue({ regionId, issueId: issue.regional_issue_id }).unwrap();
      setDialogType(null);
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to close issue.");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setErrorMsg("");
      await addComment({
        regionId,
        issueId: issue.regional_issue_id,
        comment_text: commentText,
      }).unwrap();
      setCommentText("");
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to add comment.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <Link href={`/${regionId}/issues`}>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-foreground">
                {issue.issue_number}
              </h1>
              <RegionalIssueStatusBadge status={issue.status} />
              <RegionalEscalationStatusBadge status={issue.escalation_status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted by {issue.raiser?.full_name || issue.raiser?.email || "Unknown"} on{" "}
              {issue.created_at ? format(new Date(issue.created_at), "PPP p") : "—"}
            </p>
          </div>
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Segregation of duties alert for raiser */}
          {isRaiser && issue.status !== "closed" && issue.status !== "rejected" && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded border border-amber-200">
              <Lock className="h-3.5 w-3.5" />
              <span>Segregation of duties: You raised this issue</span>
            </div>
          )}

          {/* Workflow Transitions for Reviewers/Managers (not raiser) */}
          {!isRaiser && canReview && issue.status === "submitted" && (
            <Button
              size="sm"
              onClick={handleStartReview}
              disabled={isStartingReview}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlayCircle className="h-4 w-4 mr-1.5" />
              Start Review
            </Button>
          )}

          {!isRaiser && canReview && issue.status === "under_review" && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setErrorMsg("");
                  setResponseNotes("");
                  setDialogType("accept");
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Accept Issue
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setErrorMsg("");
                  setResponseNotes("");
                  setDialogType("reject");
                }}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject Issue
              </Button>
            </>
          )}

          {!isRaiser && canResolve && issue.status === "accepted" && (
            <Button
              size="sm"
              onClick={() => {
                setErrorMsg("");
                setResponseNotes("");
                setDialogType("resolve");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Resolve Issue
            </Button>
          )}

          {!isRaiser && canClose && issue.status === "resolved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setErrorMsg("");
                setDialogType("close");
              }}
              className="border-slate-300"
            >
              Close Issue
            </Button>
          )}

          {/* Escalation Trigger (Phase 7.4) */}
          {canEscalate &&
            issue.escalation_status === "none" &&
            ["submitted", "under_review", "accepted"].includes(issue.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => (onOpenEscalateModal ? onOpenEscalateModal() : setIsEscalateModalOpen(true))}
                className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50"
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Escalate to Federal
              </Button>
            )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Info & Details */}
        <div className="lg:col-span-2 space-y-6">
          {issue.escalation_status !== "none" && (
            <RegionalEscalationTrackingCard
              regionId={regionId}
              issueId={issue.regional_issue_id}
              onRefresh={onRefresh}
            />
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">{issue.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Description
                </Label>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {issue.justification && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Justification
                  </Label>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                    {issue.justification}
                  </p>
                </div>
              )}

              {issue.response && (
                <div className="pt-2 border-t bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded border border-teal-200">
                  <Label className="text-xs text-teal-800 font-semibold uppercase tracking-wider">
                    Acceptance Response
                  </Label>
                  <p className="mt-1 text-sm text-teal-950 dark:text-teal-200 whitespace-pre-wrap">
                    {issue.response}
                  </p>
                </div>
              )}

              {issue.rejection_reason && (
                <div className="pt-2 border-t bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded border border-rose-200">
                  <Label className="text-xs text-rose-800 font-semibold uppercase tracking-wider">
                    Rejection Reason
                  </Label>
                  <p className="mt-1 text-sm text-rose-950 dark:text-rose-200 whitespace-pre-wrap">
                    {issue.rejection_reason}
                  </p>
                </div>
              )}

              {issue.resolution_notes && (
                <div className="pt-2 border-t bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                      Resolution Notes
                    </Label>
                    {issue.resolved_at && (
                      <span className="text-[11px] text-emerald-700">
                        Resolved on {format(new Date(issue.resolved_at), "PPP")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-emerald-950 dark:text-emerald-200 whitespace-pre-wrap">
                    {issue.resolution_notes}
                  </p>
                </div>
              )}

              {/* Attachments Section */}
              {issue.attachments && issue.attachments.length > 0 && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments ({issue.attachments.length})
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {issue.attachments.map((att) => (
                      <a
                        key={att.attachment_id}
                        href={`/api/regional/issues/${regionId}/${issue.regional_issue_id}/attachments/${att.attachment_id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded border bg-muted/30 hover:bg-muted text-xs text-foreground hover:text-blue-600 transition"
                      >
                        <span className="truncate max-w-[180px]">{att.file_name}</span>
                        <Download className="h-3.5 w-3.5 ml-2 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Thread */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments & Discussion ({issue.comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {issue.comments && issue.comments.length > 0 ? (
                  issue.comments.map((comment) => (
                    <div
                      key={comment.comment_id}
                      className="p-3 rounded-lg bg-muted/40 border space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {comment.author?.full_name || comment.author?.email || "User"}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {comment.created_at
                            ? format(new Date(comment.created_at), "MMM d, yyyy h:mm a")
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {comment.comment_text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No comments yet on this regional issue.
                  </p>
                )}
              </div>

              {canComment && (
                <form onSubmit={handleCommentSubmit} className="pt-3 border-t space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isCommenting || !commentText.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Add Comment
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Meta Information & History */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Issue Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Region
                </span>
                <span className="font-medium text-foreground">{issue.region?.name || "Regional Bureau"}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Department
                </span>
                <span className="font-medium text-foreground">
                  {issue.regionalStructure?.name || "General Region"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{issue.category?.name || "—"}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground">Priority</span>
                <span>
                  {issue.priority ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                      style={{
                        backgroundColor: issue.priority.color_hex
                          ? `${issue.priority.color_hex}15`
                          : undefined,
                        borderColor: issue.priority.color_hex || undefined,
                        color: issue.priority.color_hex || undefined,
                      }}
                    >
                      {issue.priority.label}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Raiser
                </span>
                <span className="font-medium text-foreground truncate max-w-[150px]">
                  {issue.raiser?.full_name || issue.raiser?.email || "Unknown"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Assignee
                </span>
                <span className="font-medium text-foreground truncate max-w-[150px]">
                  {issue.assignee?.full_name || "Unassigned"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Created
                </span>
                <span className="font-medium text-foreground">
                  {issue.created_at ? format(new Date(issue.created_at), "yyyy-MM-dd") : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Audit History Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4" /> Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issue.histories && issue.histories.length > 0 ? (
                  issue.histories.map((h, index) => (
                    <div key={h.history_id || index} className="relative pl-5 pb-3 border-l-2 border-muted last:border-l-0">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                      <div className="text-xs font-semibold text-foreground">
                        {h.action_type === "created"
                          ? "Issue Created"
                          : h.action_type === "status_changed"
                          ? `Status changed: ${h.old_value} → ${h.new_value}`
                          : h.action_type}
                      </div>
                      {h.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>
                      )}
                      <div className="text-[10px] text-muted-foreground/70 mt-1">
                        By {h.performer?.full_name || "System"} on{" "}
                        {h.created_at ? format(new Date(h.created_at), "MMM d, h:mm a") : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No history recorded.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogType !== null} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "accept" && "Accept Regional Issue"}
              {dialogType === "reject" && "Reject Regional Issue"}
              {dialogType === "resolve" && "Resolve Regional Issue"}
              {dialogType === "close" && "Close Regional Issue"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "accept" && "Provide acceptance remarks or instructions for the team."}
              {dialogType === "reject" && "Explain why this regional issue is being rejected."}
              {dialogType === "resolve" && "Record the resolution actions and evidence."}
              {dialogType === "close" && "Confirm that this regional issue is completely concluded."}
            </DialogDescription>
          </DialogHeader>

          {dialogType !== "close" && (
            <div className="space-y-2 py-2">
              <Label className="text-sm font-medium">
                {dialogType === "reject" ? "Rejection Reason *" : "Notes / Explanation"}
              </Label>
              <Textarea
                placeholder={
                  dialogType === "reject"
                    ? "Enter required rejection explanation..."
                    : dialogType === "resolve"
                    ? "Enter required resolution notes..."
                    : "Enter notes..."
                }
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            {dialogType === "accept" && (
              <Button onClick={handleAccept} disabled={isAccepting} className="bg-teal-600 hover:bg-teal-700 text-white">
                Confirm Acceptance
              </Button>
            )}
            {dialogType === "reject" && (
              <Button onClick={handleReject} disabled={isRejecting} variant="destructive">
                Confirm Rejection
              </Button>
            )}
            {dialogType === "resolve" && (
              <Button onClick={handleResolve} disabled={isResolving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm Resolution
              </Button>
            )}
            {dialogType === "close" && (
              <Button onClick={handleClose} disabled={isClosing}>
                Confirm Closure
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegionalEscalateIssueModal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        regionId={regionId}
        issueId={issue.regional_issue_id}
        issueNumber={issue.issue_number}
        onEscalated={onRefresh}
      />
    </div>
  );
}
