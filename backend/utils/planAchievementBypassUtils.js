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
 * When the system setting is on, super admins or members with the special
 * bypass permission may execute/approve achievement without plan-tree assignment.
 * RBAC permissions (execute / approve / override) are still required.
 */
function userQualifiesForAchievementAssignmentBypass(user) {
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
