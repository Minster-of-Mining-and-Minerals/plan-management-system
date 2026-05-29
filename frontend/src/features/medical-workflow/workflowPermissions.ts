import type { PermissionKey } from "@/lib/permissions";

/** Normalized keys (RESOURCE:ACTION) for medical workflow UI and API. */
export const WORKFLOW_PERMISSIONS = {
  READ: "WORKFLOW:READ" as PermissionKey,
  SUBMIT: "WORKFLOW:SUBMIT" as PermissionKey,
  FORWARD: "WORKFLOW:FORWARD" as PermissionKey,
  RETURN: "WORKFLOW:RETURN" as PermissionKey,
  PRESCRIBE: "WORKFLOW:PRESCRIBE" as PermissionKey,
  COMPLETE: "WORKFLOW:COMPLETE" as PermissionKey,
};
