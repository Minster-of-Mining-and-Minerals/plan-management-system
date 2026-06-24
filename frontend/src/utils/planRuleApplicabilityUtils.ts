import type { PlanRule } from "@/redux/types/plan";
import type { GovernmentStructure } from "@/redux/types/governmentStructure";

type StructureNode = Pick<
  GovernmentStructure,
  "government_structure_id" | "parent_id"
>;

export function collectAncestorStructureIds(
  structureId: string,
  structures: StructureNode[]
): string[] {
  const byId = new Map(
    structures.map((structure) => [structure.government_structure_id, structure])
  );
  const ids: string[] = [];
  const seen = new Set<string>();
  let currentId: string | null | undefined = structureId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    ids.push(currentId);
    currentId = byId.get(currentId)?.parent_id ?? null;
  }

  return ids;
}

export function isPlanRuleApplicableToSector(
  rule: PlanRule,
  sectorId: string,
  structures: StructureNode[]
): boolean {
  if (!rule.is_active) return false;

  if (!rule.government_structure_id) {
    return true;
  }

  if (rule.inherit_to_descendants) {
    return collectAncestorStructureIds(sectorId, structures).includes(
      rule.government_structure_id
    );
  }

  return rule.government_structure_id === sectorId;
}

export function filterApplicablePlanRules(
  rules: PlanRule[],
  sectorId: string | null | undefined,
  structures: StructureNode[]
): PlanRule[] {
  if (!sectorId) {
    return rules.filter((rule) => !rule.government_structure_id);
  }

  return rules.filter((rule) =>
    isPlanRuleApplicableToSector(rule, sectorId, structures)
  );
}
