"use strict";

const { userHasPermission } = require("./userPermissionsUtils");

const REQUEST_TARGET_REALLOCATION_KEY = "plan:request_target_reallocation";
const APPROVE_TARGET_REALLOCATION_KEY = "plan:approve_target_reallocation";

function userCanRequestTargetReallocation(userOrPermissions) {
  return userHasPermission(userOrPermissions, REQUEST_TARGET_REALLOCATION_KEY);
}

function userCanApproveTargetReallocation(userOrPermissions) {
  return userHasPermission(userOrPermissions, APPROVE_TARGET_REALLOCATION_KEY);
}

module.exports = {
  REQUEST_TARGET_REALLOCATION_KEY,
  APPROVE_TARGET_REALLOCATION_KEY,
  userCanRequestTargetReallocation,
  userCanApproveTargetReallocation,
};
