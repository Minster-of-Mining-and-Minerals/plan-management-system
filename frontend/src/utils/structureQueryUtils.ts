/**
 * Helpers for preserving government_structure_id in navigation URLs.
 */
export function structureQuerySuffix(
  governmentStructureId?: string | null,
  extraParams?: Record<string, string | undefined | null>
): string {
  const params = new URLSearchParams();

  if (governmentStructureId) {
    params.set("government_structure_id", governmentStructureId);
  }

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value != null && value !== "") {
        params.set(key, value);
      }
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function withStructureQuery(
  path: string,
  governmentStructureId?: string | null,
  extraParams?: Record<string, string | undefined | null>
): string {
  const params = new URLSearchParams();

  if (governmentStructureId) {
    params.set("government_structure_id", governmentStructureId);
  }

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value != null && value !== "") {
        params.set(key, value);
      }
    }
  }

  const query = params.toString();
  if (!query) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${query}`;
}

export function governmentStructureDetailPath(
  governmentStructureId: string
): string {
  return `/government-structures/${governmentStructureId}`;
}
