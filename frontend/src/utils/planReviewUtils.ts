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

export function formatReviewVersionLabel(
  reviewVersionNumber?: number | null
): string {
  if (!reviewVersionNumber) return "Review v1";
  return `Review v${reviewVersionNumber}`;
}

export function formatMasterDraftVersionLabel(
  versionNumber?: number | null
): string {
  if (!versionNumber) return "Draft v1";
  return `Draft v${versionNumber}`;
}

export function getPlanReviewDisplayName(
  version: Pick<
    PlanVersion,
    | "draft_name"
    | "start_year"
    | "year"
    | "planning_start_date"
    | "review_version_number"
    | "live_master_draft_name"
    | "live_master_version_number"
  >
): string {
  const baseName =
    version.live_master_draft_name ||
    version.draft_name ||
    (version.planning_start_date
      ? `Plan ${version.planning_start_date.slice(0, 4)}`
      : `Plan ${version.start_year ?? version.year}`);

  const masterLabel = version.live_master_version_number
    ? ` · ${formatMasterDraftVersionLabel(version.live_master_version_number)}`
    : "";

  const reviewLabel = version.review_version_number
    ? ` · ${formatReviewVersionLabel(version.review_version_number)}`
    : "";

  return `${baseName}${masterLabel}${reviewLabel}`;
}

export function getPlanViewBasePath(mode: "draft" | "review" = "draft"): string {
  return mode === "review" ? "/plans/review" : "/plans";
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
