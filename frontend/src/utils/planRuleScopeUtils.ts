export function formatPlanRuleScopeLabel(rule: {
  government_structure_id?: string | null;
  governmentStructure?: { name?: string } | null;
}): string {
  if (!rule.government_structure_id) {
    return "Global";
  }
  return rule.governmentStructure?.name || "Structure";
}

export function canEditPlanRule(
  rule: { government_structure_id?: string | null },
  isSuperAdmin: boolean,
  readOnly = false
): boolean {
  if (readOnly) return false;
  if (rule.government_structure_id) return true;
  return isSuperAdmin;
}

export function canDeletePlanRule(
  rule: { government_structure_id?: string | null },
  readOnly = false
): boolean {
  if (readOnly) return false;
  return Boolean(rule.government_structure_id);
}

export function canCreateGlobalPlanRule(isSuperAdmin: boolean): boolean {
  return isSuperAdmin;
}
