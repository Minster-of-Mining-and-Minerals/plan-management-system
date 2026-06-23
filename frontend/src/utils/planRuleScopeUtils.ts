export type PlanRuleScopeType = "system_global" | "inherited" | "sector";

export function resolvePlanRuleScopeType(rule: {
  government_structure_id?: string | null;
  inherit_to_descendants?: boolean;
}): PlanRuleScopeType {
  if (!rule.government_structure_id) {
    return "system_global";
  }
  if (rule.inherit_to_descendants) {
    return "inherited";
  }
  return "sector";
}

export function formatPlanRuleScopeLabel(rule: {
  government_structure_id?: string | null;
  inherit_to_descendants?: boolean;
  governmentStructure?: { name?: string } | null;
}): string {
  const scopeType = resolvePlanRuleScopeType(rule);
  if (scopeType === "system_global") {
    return "System Global";
  }
  const sectorName = rule.governmentStructure?.name || "Structure";
  if (scopeType === "inherited") {
    return `Global (${sectorName} + children)`;
  }
  return sectorName;
}

export function canEditPlanRule(
  rule: {
    government_structure_id?: string | null;
    inherit_to_descendants?: boolean;
  },
  isSuperAdmin: boolean,
  readOnly = false
): boolean {
  if (readOnly) return false;
  if (!rule.government_structure_id) return isSuperAdmin;
  return true;
}

export function canDeletePlanRule(
  rule: { government_structure_id?: string | null },
  readOnly = false
): boolean {
  if (readOnly) return false;
  return Boolean(rule.government_structure_id);
}

export function canCreateSystemGlobalPlanRule(isSuperAdmin: boolean): boolean {
  return isSuperAdmin;
}

export function canCreateInheritedPlanRule(
  isSuperAdmin: boolean,
  structureId?: string | null
): boolean {
  return isSuperAdmin || Boolean(structureId);
}

export function resolvePlanRuleScopePayload(
  scopeType: PlanRuleScopeType,
  sectorId?: string | null
): {
  government_structure_id: string | null;
  inherit_to_descendants: boolean;
} {
  if (scopeType === "system_global") {
    return { government_structure_id: null, inherit_to_descendants: false };
  }
  if (scopeType === "inherited") {
    return {
      government_structure_id: sectorId ?? null,
      inherit_to_descendants: true,
    };
  }
  return {
    government_structure_id: sectorId ?? null,
    inherit_to_descendants: false,
  };
}
