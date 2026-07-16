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
  PLAN_APPROVE_AMENDMENT_PERMISSIONS,
  PLAN_REQUEST_AMENDMENT_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
  useApprovePlanAmendmentMutation,
  useCancelPlanAmendmentMutation,
  useGetPlanAmendmentsQuery,
  useRejectPlanAmendmentMutation,
} from "@/redux/api/planApi";
import type { PlanAmendment, PlanAmendmentStatus } from "@/redux/types/plan";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AnnualTargetRevisionRequestTableProps = {
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

function statusLabel(status: PlanAmendmentStatus | string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending";
    case "approved":
      return "Approved";
    case "applied":
      return "Applied";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return String(status);
  }
}

function statusBadgeClass(status: PlanAmendmentStatus | string): string {
  switch (status) {
    case "pending_approval":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "applied":
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-rose-300 bg-rose-50 text-rose-900";
    case "cancelled":
      return "border-slate-300 bg-slate-50 text-slate-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
}

function isPending(status: string): boolean {
  return status === "pending_approval";
}

function ReviewActions({ amendment }: { amendment: PlanAmendment }) {
  const [comment, setComment] = useState("");
  const [approve, { isLoading: isApproving }] =
    useApprovePlanAmendmentMutation();
  const [reject, { isLoading: isRejecting }] = useRejectPlanAmendmentMutation();
  const isSaving = isApproving || isRejecting;
  const id = amendment.plan_amendment_id || amendment.id;

  const handleApprove = async () => {
    try {
      await approve({
        id,
        comment: comment.trim() || undefined,
      }).unwrap();
      actionFeedback.success("Annual target revision approved and applied");
      setComment("");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to approve annual target revision"
      );
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      actionFeedback.error("Comment is required when rejecting");
      return;
    }
    if (
      !(await actionFeedback.confirm("Reject this annual target revision?", {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await reject({ id, comment: comment.trim() }).unwrap();
      actionFeedback.success("Annual target revision rejected");
      setComment("");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to reject annual target revision"
      );
    }
  };

  return (
    <PermissionGuard requireAll={PLAN_APPROVE_AMENDMENT_PERMISSIONS}>
      <div className="mt-2 space-y-2 rounded-md border border-amber-100 bg-white px-3 py-2">
        <div className="space-y-1">
          <Label htmlFor={`atr-review-${id}`} className="text-xs">
            Review comment
          </Label>
          <Textarea
            id={`atr-review-${id}`}
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

function CancelButton({ amendment }: { amendment: PlanAmendment }) {
  const { user } = useAuth();
  const [cancel, { isLoading }] = useCancelPlanAmendmentMutation();
  const id = amendment.plan_amendment_id || amendment.id;
  const isRequester =
    user?.user_id && user.user_id === amendment.requested_by;

  if (!isRequester || !isPending(amendment.status)) {
    return null;
  }

  const handleCancel = async () => {
    if (
      !(await actionFeedback.confirm(
        "Cancel this pending annual target revision?",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      await cancel(id).unwrap();
      actionFeedback.success("Annual target revision cancelled");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to cancel annual target revision"
      );
    }
  };

  return (
    <PermissionGuard requireAll={PLAN_REQUEST_AMENDMENT_PERMISSIONS}>
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

export function AnnualTargetRevisionRequestTable({
  draftId,
  className,
}: AnnualTargetRevisionRequestTableProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const queryParams = useMemo(
    () => ({
      draftId,
      amendmentType: "annual_target_revision",
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 50,
    }),
    [draftId, statusFilter]
  );

  const { data, isLoading, isFetching } = useGetPlanAmendmentsQuery(
    queryParams,
    { skip: !draftId }
  );

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((row) => {
      const haystack = [
        row.title,
        row.reason,
        row.status,
        row.requester?.full_name,
        String(row.metadata?.kpiId ?? ""),
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
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, reason…"
            className="w-full sm:w-[240px]"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading || isFetching
            ? "Loading…"
            : `${rows.length} request${rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No annual target revision requests yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {rows.map((row) => {
            const id = row.plan_amendment_id || row.id;
            const revised =
              row.metadata?.revisedAnnualTarget ??
              row.metadata?.revised_annual_target;
            return (
              <li key={id} className="px-4 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{row.title}</p>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", statusBadgeClass(row.status))}
                    >
                      {statusLabel(row.status)}
                    </Badge>
                    {row.version != null && (
                      <Badge variant="outline" className="text-[10px]">
                        v{row.version}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.reason || "—"}
                    {revised != null ? ` · Revised target ${revised}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {row.requester?.full_name || "Unknown"} on{" "}
                    {formatDateTime(row.requested_at)}
                  </p>
                  {(row.reviewer || row.review_comment) && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed by {row.reviewer?.full_name || "Unknown"}
                      {row.reviewed_at
                        ? ` on ${formatDateTime(row.reviewed_at)}`
                        : ""}
                      {row.review_comment ? ` — ${row.review_comment}` : ""}
                    </p>
                  )}
                </div>

                {isPending(row.status) && (
                  <>
                    <ReviewActions amendment={row} />
                    <CancelButton amendment={row} />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
