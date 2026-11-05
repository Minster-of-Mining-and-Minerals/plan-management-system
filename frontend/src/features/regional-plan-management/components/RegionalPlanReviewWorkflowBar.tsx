"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  LockOpen,
  RefreshCw,
  CheckCircle2,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import {
  usePublishRegionalPlanForReviewMutation,
  useUnlockRegionalReviewCorrectionsMutation,
  useRepublishRegionalPlanForReviewMutation,
  useCompleteRegionalPlanReviewMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";

interface RegionalPlanReviewWorkflowBarProps {
  master: RegionalPlanVersion;
  regionId: string;
  allPeriodsFinalized: boolean;
  processStarted: boolean;
  onUpdated?: () => void;
}

export function RegionalPlanReviewWorkflowBar({
  master,
  regionId,
  allPeriodsFinalized,
  processStarted,
  onUpdated,
}: RegionalPlanReviewWorkflowBarProps) {
  const { can } = usePermissions();

  const [publishPlan, { isLoading: publishing }] = usePublishRegionalPlanForReviewMutation();
  const [unlockCorrections, { isLoading: unlocking }] = useUnlockRegionalReviewCorrectionsMutation();
  const [republishPlan, { isLoading: republishing }] = useRepublishRegionalPlanForReviewMutation();
  const [completeReview, { isLoading: completing }] = useCompleteRegionalPlanReviewMutation();

  const canPublish =
    can("REGIONAL_PLANS:PUBLISH_REVIEW") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const canReview =
    can("REGIONAL_PLANS:REVIEW") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const canFinalize =
    can("REGIONAL_PLANS:COMPLETE_REVIEW") ||
    can("REGIONAL_PLANS:FINALIZE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const reviewStatus = master.review_status;

  const isFinalized = (master.status as string) === "finalized" || (master.status as string) === "approved";
  const canInitialPublish =
    isFinalized &&
    allPeriodsFinalized &&
    !processStarted &&
    !reviewStatus;

  const canPublishNextRound =
    isFinalized &&
    allPeriodsFinalized &&
    !processStarted &&
    (reviewStatus === "review_completed" || reviewStatus === "approved");

  const isUnderReview = reviewStatus === "in_review";
  const isCorrectionsUnlocked = reviewStatus === "revision_requested";
  const isCompleted = reviewStatus === "review_completed" || reviewStatus === "approved";

  const handlePublish = async (isNextRound = false) => {
    const confirmMessage = isNextRound
      ? "Publish this regional plan for review again? Reviewers will be able to raise issues on the updated plan."
      : "Publish this regional plan for review? Assigned regional reviewers will be able to view their sections and raise issues.";

    if (
      !(await actionFeedback.confirm(confirmMessage, {
        title: isNextRound ? "Publish for Review (Next Round)" : "Publish for Review",
        confirmLabel: "Publish",
      }))
    ) {
      return;
    }
    try {
      await publishPlan({ id: master.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success("Plan published for review successfully");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to publish plan for review");
    }
  };

  const handleUnlock = async () => {
    if (
      !(await actionFeedback.confirm(
        "Unlock the regional plan for corrections? You can apply changes for reviewer findings.",
        { title: "Unlock for Corrections", confirmLabel: "Unlock" }
      ))
    ) {
      return;
    }
    try {
      await unlockCorrections({
        id: master.regional_plan_version_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success("Plan unlocked for corrections");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to unlock corrections");
    }
  };

  const handleRepublish = async () => {
    if (
      !(await actionFeedback.confirm(
        "Republish the regional plan for review? Reviewers can inspect the corrections.",
        { title: "Republish for Review", confirmLabel: "Republish" }
      ))
    ) {
      return;
    }
    try {
      await republishPlan({ id: master.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success("Plan republished for review");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to republish plan for review");
    }
  };

  const handleComplete = async (decision: "approve" | "reject") => {
    const isApprove = decision === "approve";
    const confirmMessage = isApprove
      ? "Complete and approve regional plan review? Review will close and Start Process will be enabled."
      : "Reject regional plan review? Plan will require corrections before it can proceed.";

    if (
      !(await actionFeedback.confirm(confirmMessage, {
        title: isApprove ? "Complete Review (Approve)" : "Reject Review",
        confirmLabel: isApprove ? "Complete Review" : "Reject",
      }))
    ) {
      return;
    }
    try {
      await completeReview({
        id: master.regional_plan_version_id,
        region_id: regionId,
        decision,
      }).unwrap();
      actionFeedback.success(
        isApprove ? "Regional plan review completed and approved" : "Plan review marked as rejected"
      );
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error?.data?.message || "Failed to complete review");
    }
  };

  if (!isFinalized) return null;

  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-950 dark:text-amber-200">
          Regional Plan Review
        </span>
        {reviewStatus && (
          <Badge
            variant="outline"
            className={
              reviewStatus === "in_review"
                ? "border-amber-500/30 bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 capitalize"
                : reviewStatus === "review_completed" || reviewStatus === "approved"
                ? "border-emerald-500/30 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 capitalize"
                : reviewStatus === "revision_requested"
                ? "border-orange-500/30 bg-orange-100/70 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 capitalize"
                : "border-rose-500/30 bg-rose-100/70 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 capitalize"
            }
          >
            {reviewStatus.replace(/_/g, " ")}
          </Badge>
        )}
        {isCompleted && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Review completed — Start Process is enabled.
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canInitialPublish && canPublish && (
          <Button
            size="sm"
            className="gap-2 shadow-xs"
            onClick={() => handlePublish(false)}
            disabled={publishing}
          >
            <Send className="h-4 w-4" />
            Publish for Review
          </Button>
        )}

        {canPublishNextRound && canPublish && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shadow-xs"
            onClick={() => handlePublish(true)}
            disabled={publishing}
          >
            <RefreshCw className="h-4 w-4" />
            Publish for Review (Next Round)
          </Button>
        )}

        {isUnderReview && (
          <>
            {canReview && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 shadow-xs"
                onClick={handleUnlock}
                disabled={unlocking}
              >
                <LockOpen className="h-4 w-4" />
                Unlock for Corrections
              </Button>
            )}
            {canFinalize && (
              <>
                <Button
                  size="sm"
                  className="gap-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleComplete("approve")}
                  disabled={completing}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Review (Approve)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 shadow-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  onClick={() => handleComplete("reject")}
                  disabled={completing}
                >
                  <XCircle className="h-4 w-4" />
                  Reject Review
                </Button>
              </>
            )}
          </>
        )}

        {isCorrectionsUnlocked && canPublish && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shadow-xs"
            onClick={handleRepublish}
            disabled={republishing}
          >
            <RefreshCw className="h-4 w-4" />
            Republish for Review
          </Button>
        )}
      </div>
    </div>
  );
}
