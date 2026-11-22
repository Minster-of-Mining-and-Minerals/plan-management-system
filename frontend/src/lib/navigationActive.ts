/**
 * Normalizes a nav URL by stripping trailing slashes (except root "/") and trimming whitespace.
 */
export function normalizeNavUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

/**
 * Returns the exact or most specific matching nav URL that matches the current pathname among siblings.
 * 1. If an exact match exists, it always wins immediately.
 * 2. Otherwise, finds all candidate URLs that are prefix segments of pathname (`${url}/`)
 *    and picks the longest (most specific) candidate.
 * 3. Prevents shorter prefixes (e.g. /users or /plans) from being marked active when a
 *    more specific sibling (e.g. /users/roles or /plans/review) is selected.
 */
export function getMostSpecificMatchingNavUrl(
  pathname: string,
  candidateUrls: string[]
): string | null {
  if (!pathname || !candidateUrls || candidateUrls.length === 0) {
    return null;
  }

  const normPath = normalizeNavUrl(pathname);

  // 1. Exact match takes absolute priority
  const exactMatch = candidateUrls.find(
    (url) => normalizeNavUrl(url) === normPath
  );
  if (exactMatch) {
    return exactMatch;
  }

  // 2. Filter candidates whose full path segment is a prefix of pathname
  const prefixMatches = candidateUrls.filter((url) => {
    const normUrl = normalizeNavUrl(url);
    if (!normUrl) return false;
    return normPath.startsWith(`${normUrl}/`);
  });

  if (prefixMatches.length === 0) {
    return null;
  }

  // 3. Pick the longest candidate among prefix matches
  return prefixMatches.reduce((best, current) => {
    const normBest = normalizeNavUrl(best);
    const normCurrent = normalizeNavUrl(current);
    return normCurrent.length > normBest.length ? current : best;
  });
}

/**
 * Checks whether childUrl is the single active child among siblingUrls.
 * Guarantees that at most one child under a collapsible menu is marked active.
 */
export function isNavChildActive(
  pathname: string,
  childUrl: string,
  siblingUrls: string[]
): boolean {
  const bestMatch = getMostSpecificMatchingNavUrl(pathname, siblingUrls);
  if (!bestMatch) return false;
  return normalizeNavUrl(bestMatch) === normalizeNavUrl(childUrl);
}
