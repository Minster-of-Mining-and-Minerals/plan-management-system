/**
 * Normalizes optional relation IDs for API payloads.
 * Empty strings from forms/selects become null so backend Joi validators accept them.
 */
export function normalizeOptionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}

export function sanitizeApiPayload<T>(body: T): T {
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return body;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const result = { ...(body as Record<string, unknown>) };
  for (const [key, value] of Object.entries(result)) {
    if (value === "" && (key === "parent_id" || key.endsWith("_id"))) {
      result[key] = null;
    }
  }

  return result as T;
}
