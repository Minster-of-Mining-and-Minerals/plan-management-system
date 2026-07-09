export type PlanVersionViewMode = "draft" | "review";

export type PlanVersionNavSection = "plan" | "documents" | "details";

export function getPlanVersionBasePath(
  versionId: string,
  mode: PlanVersionViewMode = "draft"
): string {
  return mode === "review" ? `/plans/review/${versionId}` : `/plans/${versionId}`;
}

export function getPlanDocumentsPath(versionId: string): string {
  return `/plans/${versionId}/documents`;
}

export function getPlanDetailsPath(
  versionId: string,
  mode: PlanVersionViewMode = "draft"
): string {
  return `${getPlanVersionBasePath(versionId, mode)}/details`;
}

export function resolvePlanVersionNavSection(
  pathname: string,
  versionId: string,
  mode: PlanVersionViewMode = "draft"
): PlanVersionNavSection {
  const documentsPath = getPlanDocumentsPath(versionId);
  const detailsPath = getPlanDetailsPath(versionId, mode);

  if (pathname.includes(documentsPath)) return "documents";
  if (pathname.includes(detailsPath)) return "details";
  return "plan";
}
