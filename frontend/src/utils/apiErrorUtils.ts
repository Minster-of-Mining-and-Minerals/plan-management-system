import { parseApiPermissionError } from "@/utils/permissionRequirementUtils";

let exposeRequiredPermissions = false;

export function setExposeRequiredPermissionsForErrors(enabled: boolean) {
  exposeRequiredPermissions = enabled;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const details = parseApiPermissionError(error, exposeRequiredPermissions);
  return details.message || fallback;
}

export function getApiErrorDetails(error: unknown, fallback = "Something went wrong") {
  return parseApiPermissionError(error, exposeRequiredPermissions) ?? { message: fallback };
}
