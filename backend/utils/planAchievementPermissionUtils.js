"use strict";

const { userHasPermission } = require("./userPermissionsUtils");

const EXECUTE_ACHIEVEMENT_KEY = "plan:execute_achievement";
const APPROVE_ACHIEVEMENT_KEY = "plan:approve_achievement";

/** @deprecated Removed — use EXECUTE_ACHIEVEMENT_KEY */
const LEGACY_EXECUTE_PLAN_KEY = "plans:execute_plan";

function userCanExecuteAchievement(userOrPermissions) {
  return userHasPermission(userOrPermissions, EXECUTE_ACHIEVEMENT_KEY);
}

function userCanApproveAchievement(userOrPermissions) {
  return userHasPermission(userOrPermissions, APPROVE_ACHIEVEMENT_KEY);
}

module.exports = {
  EXECUTE_ACHIEVEMENT_KEY,
  APPROVE_ACHIEVEMENT_KEY,
  LEGACY_EXECUTE_PLAN_KEY,
  userCanExecuteAchievement,
  userCanApproveAchievement,
};
