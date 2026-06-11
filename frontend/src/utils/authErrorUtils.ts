import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

const TOKEN_AUTH_FAILURE_MESSAGES = new Set([
  "access token required",
  "invalid or expired token",
]);

function getResponseMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" ? message.trim().toLowerCase() : "";
}

/** True when the backend rejected the JWT (message match; extra payload fields are ignored). */
export function isTokenAuthFailure(
  error: FetchBaseQueryError | undefined
): boolean {
  if (!error || typeof error.status !== "number") return false;
  const message = getResponseMessage(error.data);
  return TOKEN_AUTH_FAILURE_MESSAGES.has(message);
}
