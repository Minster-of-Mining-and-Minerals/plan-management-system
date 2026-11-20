"use strict";

const { shouldAllowAchievementAssignmentBypass } = require("../services/systemSettingsService");
const { userHasSpecialPermission, normalizePermissionKey } = require("./userPermissionsUtils");
const { isSuperAdminUser } = require("../services/planVisibilityService");

const BYPASS_ACHIEVEMENT_ASSIGNMENT_KEY = "plan:bypass_achievement_assignment";

function userHasBypassAchievementPermission(user) {
  if (!user) return false;
  const normalized = normalizePermissionKey(BYPASS_ACHIEVEMENT_ASSIGNMENT_KEY);
  if (user.permissions?.map(normalizePermissionKey).includes(normalized)) {
    return true;
  }
  return userHasSpecialPermission(user, BYPASS_ACHIEVEMENT_ASSIGNMENT_KEY);
}

/**
 * Assignment bypass is controlled by the system setting "allow_achievement_assignment_bypass"
 * (System Settings page). While it is OFF, achievement can be recorded/submitted only on nodes
 * the user is assigned to (directly, via department, or via sector) — for everyone, including
 * Super Admin. While it is ON, Super Admin and holders of PLAN:BYPASS_ACHIEVEMENT_ASSIGNMENT may
 * act on any node. RBAC permissions (execute / approve / override) are always still required.
 */
function userQualifiesForAchievementAssignmentBypass(user) {
  if (!user) return false;
  if (!shouldAllowAchievementAssignmentBypass()) {
    return false;
  }
  if (isSuperAdminUser(user)) {
    return true;
  }
  return userHasBypassAchievementPermission(user);
}

module.exports = {
  BYPASS_ACHIEVEMENT_ASSIGNMENT_KEY,
  userHasBypassAchievementPermission,
  userQualifiesForAchievementAssignmentBypass,
};
