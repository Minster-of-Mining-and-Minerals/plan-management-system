"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  PLAN_APPROVE_AMENDMENT_PERMISSIONS,
  PLAN_REQUEST_AMENDMENT_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
  useApprovePlanAmendmentMutation,
  useCancelPlanAmendmentMutation,
  useGetPlanAmendmentByIdQuery,
  useRejectPlanAmendmentMutation,
} from "@/redux/api/planApi";
import type { PlanAmendmentStatus } from "@/redux/types/plan";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AmendmentSidePanelShell } from "./AmendmentSidePanelShell";

type ReviewAction = "approve" | "reject" | null;

type KpiAdditionRequestDetailProps = {
  amendmentId: string;
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

const panelTextareaClass =
  "w-full min-h-[5rem] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function KpiAdditionRequestDetail({
  amendmentId,
  onBack,
}: KpiAdditionRequestDetailProps) {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<ReviewAction>(null);
  const [comment, setComment] = useState("");

  const { data: amendment, isLoading } = useGetPlanAmendmentByIdQuery(
    amendmentId,
    { skip: !amendmentId }
  );

  const [approve, { isLoading: isApproving }] =
    useApprovePlanAmendmentMutation();
  const [reject, { isLoading: isRejecting }] = useRejectPlanAmendmentMutation();
  const [cancel, { isLoading: isCancelling }] = useCancelPlanAmendmentMutation();

  const panelOpen = Boolean(selectedAction);
  const isPending = amendment?.status === "pending_approval";
  const isRequester =
    Boolean(user?.user_id) && user?.user_id === amendment?.requested_by;
  const isSaving = isApproving || isRejecting;

  const kpiTitle =
    amendment?.metadata?.title ??
    amendment?.metadata?.kpiTitle ??
    amendment?.metadata?.kpi_title;
  const annualTarget =
    amendment?.metadata?.annualTarget ??
    amendment?.metadata?.annual_target;
  const weight = amendment?.metadata?.weight;
  const weightMode =
    amendment?.metadata?.weightRedistributionMode ??
    amendment?.metadata?.weight_redistribution_mode;
  const parentId =
    amendment?.metadata?.parentId ?? amendment?.metadata?.parent_id;
  const startPeriodId =
    amendment?.metadata?.startPeriodId ??
    amendment?.metadata?.start_period_id;

  const closePanel = () => {
    setSelectedAction(null);
    setComment("");
  };

  const handleApprove = async () => {
    try {
      await approve({
        id: amendmentId,
        comment: comment.trim() || undefined,
      }).unwrap();
      actionFeedback.success("KPI addition approved and applied");
      closePanel();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to approve KPI addition");
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      actionFeedback.error("Comment is required when rejecting");
      return;
    }
    try {
      await reject({ id: amendmentId, comment: comment.trim() }).unwrap();
      actionFeedback.success("KPI addition rejected");
      closePanel();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to reject KPI addition");
    }
  };

  const handleCancel = async () => {
    if (
      !(await actionFeedback.confirm("Cancel this pending KPI addition?", {
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await cancel(amendmentId).unwrap();
      actionFeedback.success("KPI addition cancelled");
      onBack();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to cancel KPI addition");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!amendment) {
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
              {amendment.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {amendment.reason || "—"}
              {kpiTitle ? ` · KPI: ${kpiTitle}` : ""}
              {annualTarget != null ? ` · Annual target ${annualTarget}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Requested by {amendment.requester?.full_name || "Unknown"} on{" "}
              {formatDateTime(amendment.requested_at)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(statusBadgeClass(amendment.status))}
            >
              {statusLabel(amendment.status)}
            </Badge>
            {amendment.version != null && (
              <Badge variant="outline">v{amendment.version}</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="KPI title" value={kpiTitle ? String(kpiTitle) : "—"} />
          <DetailField
            label="Parent"
            value={parentId ? String(parentId) : "—"}
          />
          <DetailField
            label="Annual target"
            value={annualTarget != null ? String(annualTarget) : "—"}
          />
          <DetailField
            label="Weight"
            value={weight != null ? String(weight) : "—"}
          />
          <DetailField
            label="Weight redistribution mode"
            value={weightMode != null ? String(weightMode) : "—"}
          />
          <DetailField
            label="Start period"
            value={startPeriodId ? String(startPeriodId) : "—"}
          />
          <DetailField
            label="Description"
            value={amendment.description || "—"}
          />
          <DetailField
            label="Effective mode"
            value={amendment.effective_mode || "immediate"}
          />
          <DetailField
            label="Effective date"
            value={
              amendment.effective_date
                ? formatDateTime(amendment.effective_date)
                : "—"
            }
          />
          <DetailField
            label="Review comment"
            value={amendment.review_comment || "—"}
          />
          <DetailField
            label="Reviewed by"
            value={amendment.reviewer?.full_name || "—"}
          />
        </div>

        {isPending && isRequester && (
          <PermissionGuard requireAll={PLAN_REQUEST_AMENDMENT_PERMISSIONS}>
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
          <PermissionGuard requireAll={PLAN_APPROVE_AMENDMENT_PERMISSIONS}>
            <div className="mt-5">
              <h3 className="mb-2 text-base font-semibold text-foreground">
                Select action
              </h3>
              <div className="flex flex-col gap-2 md:flex-row">
                {(
                  [
                    {
                      key: "approve" as const,
                      label: "Approve KPI addition",
                      desc: "Apply the new KPI. Comment is optional.",
                    },
                    {
                      key: "reject" as const,
                      label: "Reject KPI addition",
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
            title="Approve KPI addition"
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
            title="Reject KPI addition"
            subtitle="Provide a reason for rejection"
            onClose={closePanel}
          >
            <div className="space-y-2">
              <Label>Rejection comment</Label>
              <textarea
                className={cn(panelTextareaClass, "min-h-28")}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain why this KPI addition is being rejected"
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
