/**
 * Helpers for preserving government_structure_id in navigation URLs.
 */
export function structureQuerySuffix(
  governmentStructureId?: string | null
): string {
  if (!governmentStructureId) return "";
  return `?government_structure_id=${encodeURIComponent(governmentStructureId)}`;
}

export function withStructureQuery(
  path: string,
  governmentStructureId?: string | null
): string {
  return `${path}${structureQuerySuffix(governmentStructureId)}`;
}
