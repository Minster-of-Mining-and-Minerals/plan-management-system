import type { TargetReallocationStatus } from "@/redux/types/plan";

export const TARGET_REALLOCATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  APPLIED: "applied",
} as const satisfies Record<string, TargetReallocationStatus>;

export function targetReallocationStatusLabel(
  status: TargetReallocationStatus | string | null | undefined
): string {
  switch (String(status ?? "").toLowerCase()) {
    case TARGET_REALLOCATION_STATUS.PENDING:
      return "Pending";
    case TARGET_REALLOCATION_STATUS.APPROVED:
      return "Approved";
    case TARGET_REALLOCATION_STATUS.REJECTED:
      return "Rejected";
    case TARGET_REALLOCATION_STATUS.CANCELLED:
      return "Cancelled";
    case TARGET_REALLOCATION_STATUS.APPLIED:
      return "Applied";
    default:
      return "Pending";
  }
}

export function isPendingTargetReallocation(
  status: TargetReallocationStatus | string | null | undefined
): boolean {
  return String(status ?? "").toLowerCase() === TARGET_REALLOCATION_STATUS.PENDING;
}

export function targetReallocationStatusBadgeClass(
  status: TargetReallocationStatus | string | null | undefined
): string {
  switch (String(status ?? "").toLowerCase()) {
    case TARGET_REALLOCATION_STATUS.PENDING:
      return "border-amber-200 bg-amber-50 text-amber-900";
    case TARGET_REALLOCATION_STATUS.APPLIED:
      return "border-green-200 bg-green-50 text-green-900";
    case TARGET_REALLOCATION_STATUS.REJECTED:
      return "border-red-200 bg-red-50 text-red-900";
    case TARGET_REALLOCATION_STATUS.CANCELLED:
      return "border-slate-200 bg-slate-50 text-slate-700";
    case TARGET_REALLOCATION_STATUS.APPROVED:
      return "border-blue-200 bg-blue-50 text-blue-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}
