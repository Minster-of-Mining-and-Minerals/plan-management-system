"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  PLAN_APPROVE_TARGET_REALLOCATION_PERMISSIONS,
  PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
  useApproveTargetReallocationMutation,
  useCancelTargetReallocationMutation,
  useGetTargetReallocationsQuery,
  useRejectTargetReallocationMutation,
} from "@/redux/api/planApi";
import {
  isPendingTargetReallocation,
  targetReallocationStatusBadgeClass,
  targetReallocationStatusLabel,
} from "@/utils/planTargetReallocationWorkflowUtils";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AmendmentSidePanelShell } from "./AmendmentSidePanelShell";

type ReviewAction = "approve" | "reject" | null;

type TargetReallocationRequestDetailProps = {
  draftId: string;
  requestId: string;
  onBack: () => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const panelTextareaClass =
  "w-full min-h-[5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function TargetReallocationRequestDetail({
  draftId,
  requestId,
  onBack,
}: TargetReallocationRequestDetailProps) {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<ReviewAction>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useGetTargetReallocationsQuery(
    { draft_id: draftId, limit: 100, sort_by: "requested_at", sort_order: "DESC" },
    { skip: !draftId }
  );

  const request = useMemo(
    () =>
      (data?.data ?? []).find(
        (row) => row.target_reallocation_request_id === requestId
      ),
    [data?.data, requestId]
  );

  const [approveRequest, { isLoading: isApproving }] =
    useApproveTargetReallocationMutation();
  const [rejectRequest, { isLoading: isRejecting }] =
    useRejectTargetReallocationMutation();
  const [cancelRequest, { isLoading: isCancelling }] =
    useCancelTargetReallocationMutation();

  const panelOpen = Boolean(selectedAction);
  const isPending = request ? isPendingTargetReallocation(request.status) : false;
  const isRequester =
    Boolean(user?.user_id) && user?.user_id === request?.requested_by;
  const isSaving = isApproving || isRejecting;

  const closePanel = () => {
    setSelectedAction(null);
    setComment("");
  };

  const handleApprove = async () => {
    try {
      await approveRequest({
        id: requestId,
        comment: comment.trim() || null,
      }).unwrap();
      actionFeedback.success("Target reallocation approved and applied");
      closePanel();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to approve target reallocation"
      );
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      actionFeedback.error("Comment is required when rejecting a request");
      return;
    }
    try {
      await rejectRequest({
        id: requestId,
        comment: comment.trim(),
      }).unwrap();
      actionFeedback.success("Target reallocation request rejected");
      closePanel();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to reject target reallocation"
      );
    }
  };

  const handleCancel = async () => {
    if (
      !(await actionFeedback.confirm(
        "Cancel this pending target reallocation request?",
        { destructive: true }
      ))
    ) {
      return;
    }
    try {
      await cancelRequest({ id: requestId }).unwrap();
      actionFeedback.success("Target reallocation request cancelled");
      onBack();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to cancel target reallocation"
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

  if (!request) {
    return (
      <div className="space-y-3 p-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </button>
        <p className="text-sm text-muted-foreground">Request not found.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[480px] overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      <div
        className={cn(
          "w-full transition-all duration-500 ease-in-out",
          panelOpen && "lg:pr-[360px]"
        )}
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-sm text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </button>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {request.kpi_title || "Target Reallocation"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.from_period_label || "Source"} →{" "}
              {request.to_period_label || "Destination"} · Amount{" "}
              <span className="font-medium text-foreground">{request.amount}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Requested by {request.requested_by_user?.full_name || "Unknown"} on{" "}
              {formatDateTime(request.requested_at)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(targetReallocationStatusBadgeClass(request.status))}
          >
            {targetReallocationStatusLabel(request.status)}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Reason" value={request.reason || "—"} />
          <DetailField
            label="Review comment"
            value={request.review_comment || "—"}
          />
          <DetailField
            label="Reviewed by"
            value={request.reviewed_by_user?.full_name || "—"}
          />
          <DetailField
            label="Reviewed at"
            value={formatDateTime(request.reviewed_at)}
          />
        </div>

        {isPending && isRequester && (
          <PermissionGuard requireAll={PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS}>
            <div className="mt-4">
              <Button
                variant="outline"
                disabled={isCancelling}
                onClick={handleCancel}
              >
                {isCancelling ? "Cancelling…" : "Cancel request"}
              </Button>
            </div>
          </PermissionGuard>
        )}

        {isPending && (
          <PermissionGuard requireAll={PLAN_APPROVE_TARGET_REALLOCATION_PERMISSIONS}>
            <div className="mt-5">
              <h3 className="mb-2 text-base font-semibold text-foreground">
                Select action
              </h3>
              <div className="flex flex-col gap-2 md:flex-row">
                {(
                  [
                    {
                      key: "approve" as const,
                      label: "Approve request",
                      desc: "Apply the reallocation. Comment is optional.",
                    },
                    {
                      key: "reject" as const,
                      label: "Reject request",
                      desc: "Reject with a required comment.",
                    },
                  ] as const
                ).map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => setSelectedAction(action.key)}
                    className={cn(
                      "relative flex-1 rounded-lg border p-3 text-left transition-all",
                      selectedAction === action.key
                        ? "border-primary bg-accent ring-1 ring-ring"
                        : "cursor-pointer border-border bg-card hover:bg-muted/50"
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
                      <p className="font-semibold text-foreground">
                        {action.label}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </PermissionGuard>
        )}
      </div>

      <AnimatePresence>
        {selectedAction === "approve" ? (
          <AmendmentSidePanelShell
            title="Approve reallocation"
            subtitle="Optionally add a review comment"
            onClose={closePanel}
          >
            <div className="space-y-2">
              <Label>Review comment (optional)</Label>
              <textarea
                className={panelTextareaClass}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Optional note for the requester"
              />
            </div>
            <div className="mt-2 flex justify-end gap-3 pb-4">
              <Button variant="outline" onClick={closePanel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isSaving}>
                {isApproving ? "Approving…" : "Confirm approve"}
              </Button>
            </div>
          </AmendmentSidePanelShell>
        ) : null}
        {selectedAction === "reject" ? (
          <AmendmentSidePanelShell
            title="Reject reallocation"
            subtitle="Provide a reason for rejection"
            onClose={closePanel}
          >
            <div className="space-y-2">
              <Label>Rejection comment</Label>
              <textarea
                className={cn(panelTextareaClass, "min-h-28")}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain why this request is being rejected"
              />
            </div>
            <div className="mt-2 flex justify-end gap-3 pb-4">
              <Button variant="outline" onClick={closePanel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSaving}
              >
                {isRejecting ? "Rejecting…" : "Confirm reject"}
              </Button>
            </div>
          </AmendmentSidePanelShell>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
