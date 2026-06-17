import type { PlanReviewStatus, PlanVersion } from "@/redux/types/plan";
import type { PlanNode, PlanNodeType } from "@/redux/types/plan";
import type { IssueEntityType } from "@/redux/types/issue";

export function isPlanUnderReview(
  reviewStatus?: PlanReviewStatus | null
): boolean {
  return reviewStatus === "under_review";
}

export function isPlanCorrectionsUnlocked(
  reviewStatus?: PlanReviewStatus | null
): boolean {
  return reviewStatus === "corrections_unlocked";
}

export function isPlanReviewCompleted(
  reviewStatus?: PlanReviewStatus | null
): boolean {
  return reviewStatus === "review_completed";
}

export function hasBeenPublishedForReview(
  master?: Pick<PlanVersion, "published_for_review_at"> | null
): boolean {
  return Boolean(master?.published_for_review_at);
}

export function canStartProcessAfterReview(
  master?: Pick<PlanVersion, "review_status" | "published_for_review_at"> | null
): boolean {
  return (
    hasBeenPublishedForReview(master) &&
    isPlanReviewCompleted(master?.review_status)
  );
}

export function isPlanInActiveReview(
  master?: Pick<PlanVersion, "review_status"> | null
): boolean {
  return (
    isPlanUnderReview(master?.review_status) ||
    isPlanCorrectionsUnlocked(master?.review_status)
  );
}

export function isPlanReadOnlyDuringReview(
  master?: Pick<PlanVersion, "review_status"> | null
): boolean {
  return isPlanUnderReview(master?.review_status);
}

export function canRaiseReviewIssue(
  master?: Pick<PlanVersion, "review_status"> | null
): boolean {
  return isPlanUnderReview(master?.review_status);
}

export function planNodeTypeToIssueEntityType(
  nodeType: PlanNodeType,
  context: "node" | "target" = "node"
): IssueEntityType {
  if (context === "target") return "target";
  switch (nodeType) {
    case "strategic":
      return "strategic";
    case "goal":
      return "goal";
    case "kpi":
      return "kpi";
    case "task":
      return "task";
    default:
      return "objective";
  }
}

export function getPlanNodeIssueLabel(
  node: Pick<PlanNode, "type" | "title">,
  context: "node" | "target" = "node"
): string {
  if (context === "target") return `Target: ${node.title}`;
  return node.title;
}
