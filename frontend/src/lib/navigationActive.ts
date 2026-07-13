/**
 * Returns the most specific nav URL that matches the current pathname among siblings.
 * Prevents shorter prefixes (e.g. /plans) from winning over longer ones (/plans/review).
 */
export function getMostSpecificMatchingNavUrl(
  pathname: string,
  candidateUrls: string[]
): string | null {
  const matches = candidateUrls.filter(
    (url) => pathname === url || pathname.startsWith(`${url}/`)
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.reduce((best, current) =>
    current.length > best.length ? current : best
  );
}

export function isNavChildActive(
  pathname: string,
  childUrl: string,
  siblingUrls: string[]
): boolean {
  return getMostSpecificMatchingNavUrl(pathname, siblingUrls) === childUrl;
}
