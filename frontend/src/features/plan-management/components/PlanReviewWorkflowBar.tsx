"use client";

import { useState } from "react";
import { ClipboardCheck, LockOpen, RefreshCw, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
  PLAN_PUBLISH_FOR_REVIEW_PERMISSIONS,
  PLAN_UNLOCK_REVIEW_PERMISSIONS,
  PLAN_REPUBLISH_REVIEW_PERMISSIONS,
  PLAN_COMPLETE_REVIEW_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import {
  usePublishForReviewMutation,
  useUnlockReviewCorrectionsMutation,
  useRepublishForReviewMutation,
  useCompleteReviewMutation,
} from "@/redux/api/planApi";
import type { PlanVersion } from "@/redux/types/plan";
import {
  isPlanCorrectionsUnlocked,
  isPlanReviewCompleted,
  isPlanUnderReview,
  formatReviewVersionLabel,
} from "@/utils/planReviewUtils";

interface PlanReviewWorkflowBarProps {
  master: PlanVersion;
  allPeriodsFinalized: boolean;
  processStarted: boolean;
  onUpdated?: () => void;
}

export function PlanReviewWorkflowBar({
  master,
  allPeriodsFinalized,
  processStarted,
  onUpdated,
}: PlanReviewWorkflowBarProps) {
  const [publishForReview, { isLoading: publishing }] = usePublishForReviewMutation();
  const [unlockCorrections, { isLoading: unlocking }] = useUnlockReviewCorrectionsMutation();
  const [republishForReview, { isLoading: republishing }] = useRepublishForReviewMutation();
  const [completeReview, { isLoading: completing }] = useCompleteReviewMutation();

  const reviewStatus = master.review_status;
  const canPublish =
    master.status === "finalized" &&
    allPeriodsFinalized &&
    !processStarted &&
    !reviewStatus;

  const handlePublish = async () => {
    if (
      !(await actionFeedback.confirm(
        "Publish this plan for review? Assigned reviewers will be able to view their sections and raise issues. The plan becomes read-only.",
        { title: "Publish for Review", confirmLabel: "Publish" }
      ))
    ) {
      return;
    }
    try {
      await publishForReview(master.plan_version_id).unwrap();
      actionFeedback.success("Plan published for review");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { errors?: string[]; message?: string } };
      actionFeedback.error(
        error.data?.errors?.join(" ") || error.data?.message || "Failed to publish for review"
      );
    }
  };

  const handleUnlock = async () => {
    if (
      !(await actionFeedback.confirm(
        "Unlock the plan for corrections? You can apply changes for accepted issues.",
        { title: "Unlock for Corrections", confirmLabel: "Unlock" }
      ))
    ) {
      return;
    }
    try {
      await unlockCorrections(master.plan_version_id).unwrap();
      actionFeedback.success("Plan unlocked for corrections");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { errors?: string[]; message?: string } };
      actionFeedback.error(
        error.data?.errors?.join(" ") || error.data?.message || "Failed to unlock"
      );
    }
  };

  const handleRepublish = async () => {
    if (
      !(await actionFeedback.confirm(
        "Republish for review? Editing will be locked again and reviewers can continue.",
        { title: "Republish for Review", confirmLabel: "Republish" }
      ))
    ) {
      return;
    }
    try {
      await republishForReview(master.plan_version_id).unwrap();
      actionFeedback.success("Plan republished for review");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { errors?: string[]; message?: string } };
      actionFeedback.error(
        error.data?.errors?.join(" ") || error.data?.message || "Failed to republish"
      );
    }
  };

  const handleComplete = async () => {
    if (
      !(await actionFeedback.confirm(
        "Complete plan review? All issues must be resolved, closed, or rejected. Review will close and Start Process will be enabled.",
        { title: "Complete Review", confirmLabel: "Complete Review" }
      ))
    ) {
      return;
    }
    try {
      await completeReview(master.plan_version_id).unwrap();
      actionFeedback.success("Plan review completed");
      onUpdated?.();
    } catch (err: unknown) {
      const error = err as { data?: { errors?: string[]; message?: string } };
      actionFeedback.error(
        error.data?.errors?.join(" ") || error.data?.message || "Failed to complete review"
      );
    }
  };

  if (master.status !== "finalized") return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-blue-700" />
        <span className="text-sm font-medium text-blue-900">Plan Review</span>
        {reviewStatus && (
          <Badge variant="outline" className="capitalize">
            {reviewStatus.replace(/_/g, " ")}
          </Badge>
        )}
        {master.active_review_version_number != null && isPlanUnderReview(reviewStatus) && (
          <Badge variant="outline" className="font-mono text-xs">
            {formatReviewVersionLabel(master.active_review_version_number)}
          </Badge>
        )}
        {(master.review_round_count ?? 0) > 0 && (
          <span className="text-xs text-blue-700">
            {master.review_round_count} review round
            {master.review_round_count === 1 ? "" : "s"} for this draft
          </span>
        )}
        {isPlanReviewCompleted(reviewStatus) && (
          <span className="text-xs text-green-700">Review closed — Start Process is available</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canPublish && (
          <PermissionGuard requireAll={PLAN_PUBLISH_FOR_REVIEW_PERMISSIONS}>
            <Button size="sm" className="gap-2" onClick={handlePublish} disabled={publishing}>
              <Send className="h-4 w-4" />
              Publish for Review
            </Button>
          </PermissionGuard>
        )}

        {isPlanUnderReview(reviewStatus) && (
          <>
            <PermissionGuard requireAll={PLAN_UNLOCK_REVIEW_PERMISSIONS}>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleUnlock}
                disabled={unlocking}
              >
                <LockOpen className="h-4 w-4" />
                Unlock for Corrections
              </Button>
            </PermissionGuard>
            <PermissionGuard requireAll={PLAN_COMPLETE_REVIEW_PERMISSIONS}>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleComplete}
                disabled={completing}
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Review
              </Button>
            </PermissionGuard>
          </>
        )}

        {isPlanCorrectionsUnlocked(reviewStatus) && (
          <PermissionGuard requireAll={PLAN_REPUBLISH_REVIEW_PERMISSIONS}>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleRepublish}
              disabled={republishing}
            >
              <RefreshCw className="h-4 w-4" />
              Republish for Review
            </Button>
          </PermissionGuard>
        )}
      </div>
    </div>
  );
}
