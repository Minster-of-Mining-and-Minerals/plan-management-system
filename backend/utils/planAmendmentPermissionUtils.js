"use strict";

const { userHasPermission } = require("./userPermissionsUtils");
const {
  REQUEST_TARGET_REALLOCATION_KEY,
  APPROVE_TARGET_REALLOCATION_KEY,
} = require("./planTargetReallocationPermissionUtils");
const {
  REQUEST_EXECUTION_REOPENING_KEY,
  APPROVE_EXECUTION_REOPENING_KEY,
} = require("./planExecutionReopeningPermissionUtils");

const REQUEST_AMENDMENT_KEY = "plan:request_amendment";
const APPROVE_AMENDMENT_KEY = "plan:approve_amendment";

function userCanRequestAmendment(userOrPermissions) {
  return (
    userHasPermission(userOrPermissions, REQUEST_AMENDMENT_KEY) ||
    userHasPermission(userOrPermissions, REQUEST_TARGET_REALLOCATION_KEY) ||
    userHasPermission(userOrPermissions, REQUEST_EXECUTION_REOPENING_KEY)
  );
}

function userCanApproveAmendment(userOrPermissions) {
  return (
    userHasPermission(userOrPermissions, APPROVE_AMENDMENT_KEY) ||
    userHasPermission(userOrPermissions, APPROVE_TARGET_REALLOCATION_KEY) ||
    userHasPermission(userOrPermissions, APPROVE_EXECUTION_REOPENING_KEY)
  );
}

module.exports = {
  REQUEST_AMENDMENT_KEY,
  APPROVE_AMENDMENT_KEY,
  userCanRequestAmendment,
  userCanApproveAmendment,
};
