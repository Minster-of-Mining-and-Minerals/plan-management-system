import type { PermissionKey } from "@/lib/permissions";

/** Plan permissions aligned with backend planRoutes.js */
export const PLAN_PERMISSIONS = {
  CREATE: "PLANS:CREATE",
  READ: "PLANS:READ",
  UPDATE: "PLANS:UPDATE",
  DELETE: "PLANS:DELETE",
  APPROVE: "PLANS:APPROVE",
  SUBMIT: "PLANS:SUBMIT",
  EDIT_FINALIZED: "PLANS:EDIT_FINALIZED",
} as const satisfies Record<string, PermissionKey>;

/** Granular plan lifecycle actions (resource: plan) */
export const PLAN_LIFECYCLE_PERMISSIONS = {
  START_PROCESS: "PLAN:START_PROCESS",
  COMPLETE_ANNUAL: "PLAN:COMPLETE_ANNUAL",
  COMPLETE_PERIOD: "PLAN:COMPLETE_PERIOD",
  FINALIZE: "PLAN:FINALIZE",
  DRAFT_PUBLISH: "PLAN:DRAFT_PUBLISH",
} as const satisfies Record<string, PermissionKey>;

export const PLAN_START_PROCESS_PERMISSIONS: PermissionKey[] = [
  PLAN_LIFECYCLE_PERMISSIONS.START_PROCESS,
];

export const PLAN_COMPLETE_ANNUAL_PERMISSIONS: PermissionKey[] = [
  PLAN_LIFECYCLE_PERMISSIONS.COMPLETE_ANNUAL,
];

export const PLAN_COMPLETE_PERIOD_PERMISSIONS: PermissionKey[] = [
  PLAN_LIFECYCLE_PERMISSIONS.COMPLETE_PERIOD,
];

export const PLAN_FINALIZE_PERMISSIONS: PermissionKey[] = [
  PLAN_LIFECYCLE_PERMISSIONS.FINALIZE,
];

export const PLAN_DRAFT_PUBLISH_PERMISSIONS: PermissionKey[] = [
  PLAN_LIFECYCLE_PERMISSIONS.DRAFT_PUBLISH,
];

export const PLAN_ASSIGNMENT_PERMISSIONS = {
  CREATE: "PLAN_ASSIGNMENTS:CREATE",
  READ: "PLAN_ASSIGNMENTS:READ",
  UPDATE: "PLAN_ASSIGNMENTS:UPDATE",
  DELETE: "PLAN_ASSIGNMENTS:DELETE",
} as const satisfies Record<string, PermissionKey>;

/** Edit draft nodes, targets, initialize periods */
export const PLAN_UPDATE_PERMISSIONS: PermissionKey[] = [PLAN_PERMISSIONS.UPDATE];

/** Finalize draft/annual/period targets */
export const PLAN_APPROVE_PERMISSIONS: PermissionKey[] = [PLAN_PERMISSIONS.APPROVE];

/** Structure changes on draft or finalized master (UPDATE or EDIT_FINALIZED) */
export const PLAN_STRUCTURE_MUTATION_PERMISSIONS: PermissionKey[] = [
  PLAN_PERMISSIONS.UPDATE,
  PLAN_PERMISSIONS.EDIT_FINALIZED,
];

/** Create assignments on draft or finalized master */
export const PLAN_ASSIGNMENT_CREATE_PERMISSIONS: PermissionKey[] = [
  PLAN_ASSIGNMENT_PERMISSIONS.CREATE,
  PLAN_PERMISSIONS.EDIT_FINALIZED,
];

/** Remove assignments on draft or finalized master */
export const PLAN_ASSIGNMENT_DELETE_PERMISSIONS: PermissionKey[] = [
  PLAN_ASSIGNMENT_PERMISSIONS.DELETE,
  PLAN_PERMISSIONS.EDIT_FINALIZED,
];
