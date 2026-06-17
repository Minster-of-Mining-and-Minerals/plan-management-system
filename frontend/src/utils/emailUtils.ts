/**
 * Normalize email for login and lookups (trim whitespace, lowercase).
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Loose check for seeded demo / internal addresses (e.g. user@mom-demo.et).
 */
export function isValidEmailFormat(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
