export function canEditPlanningConfiguration(
  isSuperAdmin: boolean,
  editScope: "global" | "sector"
): boolean {
  if (editScope === "global") {
    return isSuperAdmin;
  }
  return true;
}

export function canRestorePlanningConfiguration(
  isSuperAdmin: boolean,
  editScope: "global" | "sector",
  hasSectorOverride: boolean
): boolean {
  if (editScope === "global") {
    return isSuperAdmin;
  }
  return hasSectorOverride;
}
