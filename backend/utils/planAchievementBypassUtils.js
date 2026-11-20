"use strict";

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
 * Super admins, and users holding the bypass permission, may execute/approve achievement
 * without plan-tree assignment — the same rule the regional workflow uses. The permission
 * itself is the control; the legacy global setting (allow_achievement_assignment_bypass) no
 * longer has to be switched on as well. RBAC permissions (execute / approve / override) are
 * still required for the action itself.
 */
function userQualifiesForAchievementAssignmentBypass(user) {
  if (!user) return false;
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
