"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  CheckCircle2,
  XCircle,
  Unlock,
  Send,
  AlertCircle,
  FileCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { RegionalPlanTabsHeader } from "./RegionalPlanTabsHeader";

import {
  useGetRegionalPlanVersionsForReviewQuery,
  usePublishRegionalPlanForReviewMutation,
  useUnlockRegionalReviewCorrectionsMutation,
  useRepublishRegionalPlanForReviewMutation,
  useCompleteRegionalPlanReviewMutation,
  useGetRegionalPublishForReviewReadinessQuery,
  useGetRegionalCompleteReviewReadinessQuery,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";

function formatReviewStatus(status: string | null | undefined) {
  if (!status) return "Draft";
  switch (status) {
    case "in_review":
      return "In Review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "revision_requested":
      return "Revision Requested";
    default:
      return status.replace(/_/g, " ");
  }
}

function getReviewStatusBadgeClass(status: string | null | undefined) {
  switch (status) {
    case "in_review":
      return "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
    case "approved":
      return "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "rejected":
      return "border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
    case "revision_requested":
      return "border-orange-500/30 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300";
    default:
      return "border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
}

export function RegionalPlanReviewVersionTable() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const regionId = params?.id;
  const { can } = usePermissions();

  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const [selectedPlan, setSelectedPlan] = useState<RegionalPlanVersion | null>(null);

  // Dialog states
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");

  const {
    data: plans = [],
    isLoading,
    refetch,
  } = useGetRegionalPlanVersionsForReviewQuery(
    { region_id: regionId, search: search || undefined },
    { skip: !regionId }
  );

  const [publishPlan, { isLoading: isPublishing }] = usePublishRegionalPlanForReviewMutation();
  const [unlockCorrections, { isLoading: isUnlocking }] = useUnlockRegionalReviewCorrectionsMutation();
  const [republishPlan, { isLoading: isRepublishing }] = useRepublishRegionalPlanForReviewMutation();
  const [completeReview, { isLoading: isCompleting }] = useCompleteRegionalPlanReviewMutation();

  // Readiness queries
  const { data: publishReadiness } = useGetRegionalPublishForReviewReadinessQuery(
    { id: selectedPlan?.regional_plan_version_id || "", region_id: regionId },
    { skip: !selectedPlan || !isPublishModalOpen }
  );

  const { data: completeReadiness } = useGetRegionalCompleteReviewReadinessQuery(
    { id: selectedPlan?.regional_plan_version_id || "", region_id: regionId },
    { skip: !selectedPlan || !isCompleteModalOpen }
  );

  const canReview = can("REGIONAL_PLANS:REVIEW") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canPublish = can("REGIONAL_PLANS:PUBLISH_REVIEW") || can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canFinalize = can("REGIONAL_PLANS:COMPLETE_REVIEW") || can("REGIONAL_PLANS:FINALIZE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");

  const filteredPlans = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) =>
        p.draft_name.toLowerCase().includes(q) ||
        (p.review_status && p.review_status.toLowerCase().includes(q)) ||
        String(p.start_year).includes(q) ||
        String(p.end_year).includes(q)
    );
  }, [plans, search]);

  const handlePublish = async () => {
    if (!selectedPlan || !regionId) return;
    try {
      await publishPlan({ id: selectedPlan.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success("Plan submitted for review successfully");
      setIsPublishModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to submit plan for review");
    }
  };

  const handleUnlock = async () => {
    if (!selectedPlan || !regionId) return;
    try {
      await unlockCorrections({
        id: selectedPlan.regional_plan_version_id,
        region_id: regionId,
        reason: unlockReason,
      }).unwrap();
      actionFeedback.success("Plan unlocked for corrections");
      setIsUnlockModalOpen(false);
      setUnlockReason("");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to unlock corrections");
    }
  };

  const handleRepublish = async (plan: RegionalPlanVersion) => {
    if (!regionId) return;
    try {
      await republishPlan({ id: plan.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success("Plan resubmitted for review");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to resubmit plan for review");
    }
  };

  const handleComplete = async (decision: "approve" | "reject") => {
    if (!selectedPlan || !regionId) return;
    try {
      await completeReview({
        id: selectedPlan.regional_plan_version_id,
        region_id: regionId,
        decision,
      }).unwrap();
      actionFeedback.success(decision === "approve" ? "Plan approved successfully" : "Plan review closed as rejected");
      setIsCompleteModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to complete review");
    }
  };

  const columns: ColumnDef<RegionalPlanVersion>[] = [
    {
      accessorKey: "draft_name",
      header: "Plan Name",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-foreground hover:underline cursor-pointer"
              onClick={() => router.push(`/${regionId}/plans/${p.regional_plan_version_id}`)}>
              {p.draft_name}
            </span>
            <span className="text-xs text-muted-foreground">
              Master Plan • Version {p.version_number}
            </span>
          </div>
        );
      },
    },
    {
      id: "planning_period",
      header: "Planning Period",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.start_year} - {row.original.end_year}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.planning_duration_years} Years
        </span>
      ),
    },
    {
      accessorKey: "review_status",
      header: "Review Status",
      cell: ({ row }) => {
        const status = row.original.review_status || row.original.status;
        return (
          <Badge
            variant="outline"
            className={`capitalize font-medium px-2.5 py-0.5 border ${getReviewStatusBadgeClass(status)}`}
          >
            {formatReviewStatus(status)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const p = row.original;
        const status = p.review_status || p.status;

        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={() => router.push(`/${regionId}/plans/${p.regional_plan_version_id}`)}
              title="Inspect Plan Hierarchy"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Inspect</span>
            </Button>

            {/* If in draft or revision requested, allow publish */}
            {canPublish && (status === "draft" || !p.review_status) && (
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => {
                  setSelectedPlan(p);
                  setIsPublishModalOpen(true);
                }}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit for Review</span>
              </Button>
            )}

            {canPublish && status === "revision_requested" && (
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleRepublish(p)}
                disabled={isRepublishing}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Resubmit</span>
              </Button>
            )}

            {/* If in review, allow unlocking corrections or completing review */}
            {canReview && status === "in_review" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => {
                  setSelectedPlan(p);
                  setIsUnlockModalOpen(true);
                }}
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>Request Revision</span>
              </Button>
            )}

            {canFinalize && status === "in_review" && (
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setSelectedPlan(p);
                  setIsCompleteModalOpen(true);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Decision</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <RegionalPlanTabsHeader />

      <TableLayout
        title="Plan Review Queue"
        description="Inspect submitted regional plans, review hierarchy and targets, request revisions, and finalize approval decisions."
      >
        <DataTable
          columns={columns}
          data={filteredPlans}
          isLoading={isLoading}
        />
      </TableLayout>

      {/* Submit for Review Modal */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <span>Submit Plan for Review</span>
            </DialogTitle>
            <DialogDescription>
              Submit <strong>{selectedPlan?.draft_name}</strong> for formal review and administrative evaluation.
            </DialogDescription>
          </DialogHeader>

          {publishReadiness && (
            <div className="space-y-3 py-2">
              {publishReadiness.ready ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>The plan structure is verified and ready for review submission.</span>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Readiness check failed:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {publishReadiness.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handlePublish}
              disabled={isPublishing || (publishReadiness && !publishReadiness.ready)}
            >
              {isPublishing ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Corrections / Request Revision Modal */}
      <Dialog open={isUnlockModalOpen} onOpenChange={setIsUnlockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Unlock className="h-5 w-5 text-amber-600" />
              <span>Request Plan Revision</span>
            </DialogTitle>
            <DialogDescription>
              Unlock <strong>{selectedPlan?.draft_name}</strong> back to draft status so responsible planners can make requested modifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-foreground">Revision Notes / Reason</label>
            <Textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="Detail required adjustments, missing indicators, or target revisions..."
              className="min-h-[100px] text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsUnlockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleUnlock}
              disabled={isUnlocking}
            >
              {isUnlocking ? "Unlocking..." : "Unlock for Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Review Decision Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <span>Complete Plan Review</span>
            </DialogTitle>
            <DialogDescription>
              Record the final administrative review decision for <strong>{selectedPlan?.draft_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {completeReadiness && !completeReadiness.ready && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Cannot complete review:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {completeReadiness.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={() => handleComplete("reject")}
              disabled={isCompleting || (completeReadiness && !completeReadiness.ready)}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              <span>Reject Plan</span>
            </Button>
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleComplete("approve")}
              disabled={isCompleting || (completeReadiness && !completeReadiness.ready)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              <span>Approve Plan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
