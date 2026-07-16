"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import type {
  TargetReallocationRequest,
  TargetReallocationStatus,
} from "@/redux/types/plan";
import {
  TARGET_REALLOCATION_STATUS,
  isPendingTargetReallocation,
  targetReallocationStatusBadgeClass,
  targetReallocationStatusLabel,
} from "@/utils/planTargetReallocationWorkflowUtils";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type TargetReallocationRequestTableProps = {
  draftId: string;
  className?: string;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function RequestReviewActions({
  request,
}: {
  request: TargetReallocationRequest;
}) {
  const [comment, setComment] = useState("");
  const [approveRequest, { isLoading: isApproving }] =
    useApproveTargetReallocationMutation();
  const [rejectRequest, { isLoading: isRejecting }] =
    useRejectTargetReallocationMutation();
  const isSaving = isApproving || isRejecting;

  const handleApprove = async () => {
    try {
      await approveRequest({
        id: request.target_reallocation_request_id,
        comment: comment.trim() || null,
      }).unwrap();
      actionFeedback.success("Target reallocation approved and applied");
      setComment("");
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
    if (
      !(await actionFeedback.confirm("Reject this target reallocation request?", {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await rejectRequest({
        id: request.target_reallocation_request_id,
        comment: comment.trim(),
      }).unwrap();
      actionFeedback.success("Target reallocation request rejected");
      setComment("");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to reject target reallocation"
      );
    }
  };

  return (
    <PermissionGuard requireAll={PLAN_APPROVE_TARGET_REALLOCATION_PERMISSIONS}>
      <div className="mt-2 space-y-2 rounded-md border border-amber-100 bg-white px-3 py-2">
        <div className="space-y-1">
          <Label htmlFor={`review-comment-${request.id}`} className="text-xs">
            Review comment
          </Label>
          <Textarea
            id={`review-comment-${request.id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={2}
            placeholder="Optional for approve; required for reject"
            className="text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={isSaving} onClick={handleApprove}>
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isSaving}
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      </div>
    </PermissionGuard>
  );
}

function CancelRequestButton({ request }: { request: TargetReallocationRequest }) {
  const { user } = useAuth();
  const [cancelRequest, { isLoading }] = useCancelTargetReallocationMutation();
  const isRequester = user?.user_id && user.user_id === request.requested_by;

  if (!isRequester || !isPendingTargetReallocation(request.status)) {
    return null;
  }

  const handleCancel = async () => {
    if (
      !(await actionFeedback.confirm("Cancel this pending target reallocation request?", {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await cancelRequest({ id: request.target_reallocation_request_id }).unwrap();
      actionFeedback.success("Target reallocation request cancelled");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to cancel target reallocation"
      );
    }
  };

  return (
    <PermissionGuard requireAll={PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS}>
      <Button
        size="sm"
        variant="outline"
        disabled={isLoading}
        onClick={handleCancel}
        className="mt-2"
      >
        Cancel request
      </Button>
    </PermissionGuard>
  );
}

export function TargetReallocationRequestTable({
  draftId,
  className,
}: TargetReallocationRequestTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const queryParams = useMemo(
    () => ({
      draft_id: draftId,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as TargetReallocationStatus),
      limit: 50,
      sort_by: "requested_at",
      sort_order: "DESC" as const,
    }),
    [draftId, statusFilter]
  );

  const { data, isLoading, isFetching } = useGetTargetReallocationsQuery(
    queryParams,
    { skip: !draftId }
  );

  const requests = useMemo(() => {
    const rows = data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.kpi_title,
        row.from_period_label,
        row.to_period_label,
        row.reason,
        row.requested_by_user?.full_name,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data?.data, search]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value={TARGET_REALLOCATION_STATUS.PENDING}>
                Pending
              </SelectItem>
              <SelectItem value={TARGET_REALLOCATION_STATUS.APPLIED}>
                Applied
              </SelectItem>
              <SelectItem value={TARGET_REALLOCATION_STATUS.REJECTED}>
                Rejected
              </SelectItem>
              <SelectItem value={TARGET_REALLOCATION_STATUS.CANCELLED}>
                Cancelled
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search KPI, period, reason…"
            className="w-full sm:w-[240px]"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading || isFetching
            ? "Loading…"
            : `${requests.length} request${requests.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No target reallocation requests yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {requests.map((request) => (
            <li key={request.target_reallocation_request_id} className="px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {request.kpi_title || "KPI"}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        targetReallocationStatusBadgeClass(request.status)
                      )}
                    >
                      {targetReallocationStatusLabel(request.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.from_period_label || "Source"} →{" "}
                    {request.to_period_label || "Destination"} · Amount{" "}
                    <span className="font-medium text-foreground">
                      {request.amount}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{request.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested by{" "}
                    {request.requested_by_user?.full_name || "Unknown"} on{" "}
                    {formatDateTime(request.requested_at)}
                  </p>
                  {(request.reviewed_by_user || request.review_comment) && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed by{" "}
                      {request.reviewed_by_user?.full_name || "Unknown"}
                      {request.reviewed_at
                        ? ` on ${formatDateTime(request.reviewed_at)}`
                        : ""}
                      {request.review_comment
                        ? ` — ${request.review_comment}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              {isPendingTargetReallocation(request.status) && (
                <>
                  <RequestReviewActions request={request} />
                  <CancelRequestButton request={request} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
