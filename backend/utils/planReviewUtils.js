"use strict";

const REVIEW_STATUSES = {
  UNDER_REVIEW: "under_review",
  CORRECTIONS_UNLOCKED: "corrections_unlocked",
  REVIEW_COMPLETED: "review_completed",
};

const PLAN_REVIEW_PERMISSIONS = {
  PUBLISH: "plan:publish_for_review",
  VIEW_ASSIGNED: "plan:view_assigned_review",
  COMPLETE: "plan:complete_review",
  UNLOCK: "plan:unlock_review_corrections",
  REPUBLISH: "plan:republish_review",
};

function userHasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

function isMasterUnderReview(master) {
  return master?.review_status === REVIEW_STATUSES.UNDER_REVIEW;
}

function isMasterCorrectionsUnlocked(master) {
  return master?.review_status === REVIEW_STATUSES.CORRECTIONS_UNLOCKED;
}

function isMasterReviewCompleted(master) {
  return master?.review_status === REVIEW_STATUSES.REVIEW_COMPLETED;
}

function hasBeenPublishedForReview(master) {
  return Boolean(master?.published_for_review_at);
}

function canStartProcessAfterReview(master) {
  return hasBeenPublishedForReview(master) && isMasterReviewCompleted(master);
}

function canRaisePlanReviewIssue(master) {
  return isMasterUnderReview(master);
}

function isPlanInActiveReview(master) {
  return (
    isMasterUnderReview(master) || isMasterCorrectionsUnlocked(master)
  );
}

function canEditPlanDuringReview(master, user) {
  if (!master || master.version_kind !== "master") return true;
  if (!isPlanInActiveReview(master)) return true;
  if (isMasterCorrectionsUnlocked(master)) {
    return (
      userHasPermission(user, PLAN_REVIEW_PERMISSIONS.UNLOCK) ||
      userHasPermission(user, "plans:update") ||
      userHasPermission(user, "plans:edit_finalized")
    );
  }
  return false;
}

module.exports = {
  REVIEW_STATUSES,
  PLAN_REVIEW_PERMISSIONS,
  isMasterUnderReview,
  isMasterCorrectionsUnlocked,
  isMasterReviewCompleted,
  hasBeenPublishedForReview,
  canStartProcessAfterReview,
  canRaisePlanReviewIssue,
  isPlanInActiveReview,
  canEditPlanDuringReview,
  userHasPermission,
};
