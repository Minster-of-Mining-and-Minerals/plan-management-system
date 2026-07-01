export type PlanAchievementStatus = "empty" | "submitted" | "approved" | "rejected";

export const PLAN_ACHIEVEMENT_STATUS = {
  EMPTY: "empty",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const satisfies Record<string, PlanAchievementStatus>;

export function normalizePlanAchievementStatus(
  status: PlanAchievementStatus | string | null | undefined
): PlanAchievementStatus {
  const normalized = String(status ?? PLAN_ACHIEVEMENT_STATUS.EMPTY).toLowerCase();
  if (
    normalized === PLAN_ACHIEVEMENT_STATUS.SUBMITTED ||
    normalized === PLAN_ACHIEVEMENT_STATUS.APPROVED ||
    normalized === PLAN_ACHIEVEMENT_STATUS.REJECTED
  ) {
    return normalized;
  }
  return PLAN_ACHIEVEMENT_STATUS.EMPTY;
}

export function resolvePlanAchievementStatus(node: {
  period_actual_status?: PlanAchievementStatus | null;
  period_actual?: number | null;
}): PlanAchievementStatus {
  if (node.period_actual_status) {
    return normalizePlanAchievementStatus(node.period_actual_status);
  }
  if (node.period_actual != null) {
    return PLAN_ACHIEVEMENT_STATUS.APPROVED;
  }
  return PLAN_ACHIEVEMENT_STATUS.EMPTY;
}

export function planAchievementStatusLabel(status: PlanAchievementStatus): string {
  switch (status) {
    case PLAN_ACHIEVEMENT_STATUS.SUBMITTED:
      return "Pending approval";
    case PLAN_ACHIEVEMENT_STATUS.APPROVED:
      return "Approved";
    case PLAN_ACHIEVEMENT_STATUS.REJECTED:
      return "Rejected";
    case PLAN_ACHIEVEMENT_STATUS.EMPTY:
    default:
      return "Not submitted";
  }
}

export function isPendingPlanAchievement(status: PlanAchievementStatus): boolean {
  return status === PLAN_ACHIEVEMENT_STATUS.SUBMITTED;
}
