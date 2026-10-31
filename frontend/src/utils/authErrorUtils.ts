import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

const TOKEN_AUTH_FAILURE_MESSAGES = new Set([
  "access token required",
  "invalid or expired token",
  "user not found or inactive",
]);

const TOKEN_AUTH_FAILURE_CODES = new Set([
  "SESSION_TERMINATED",
  "SESSION_EXPIRED",
  "DEVICE_RESTRICTED",
  "IP_RESTRICTED",
]);

function getResponseCode(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function getResponseMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" ? message.trim().toLowerCase() : "";
}

/** True when the backend rejected the JWT (401, or known 403 messages). */
export function isTokenAuthFailure(
  error: FetchBaseQueryError | undefined
): boolean {
  if (!error || typeof error.status !== "number") return false;

  if (error.status === 401) {
    return true;
  }

  if (error.status === 403) {
    const code = getResponseCode(error.data);
    if (code && TOKEN_AUTH_FAILURE_CODES.has(code)) {
      return true;
    }
    const message = getResponseMessage(error.data);
    return TOKEN_AUTH_FAILURE_MESSAGES.has(message);
  }

  return false;
}

/** True when the API is unreachable while the client still holds an auth token. */
export function isNetworkAuthFailure(
  error: FetchBaseQueryError | undefined
): boolean {
  if (!error) return false;
  if (typeof window === "undefined") return false;
  if (!localStorage.getItem("authToken")) return false;

  if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") {
    return true;
  }

  if (typeof error.status === "number" && [0, 502, 503, 504].includes(error.status)) {
    return true;
  }

  return false;
}

/** Token rejected or backend unreachable — clear session and return to login. */
export function isForcedLogoutError(
  error: FetchBaseQueryError | undefined
): boolean {
  return isTokenAuthFailure(error) || isNetworkAuthFailure(error);
}
