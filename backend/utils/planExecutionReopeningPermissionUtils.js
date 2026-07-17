"use strict";

const { userHasPermission } = require("./userPermissionsUtils");

const REQUEST_EXECUTION_REOPENING_KEY = "plan:request_execution_reopening";
const APPROVE_EXECUTION_REOPENING_KEY = "plan:approve_execution_reopening";

function userCanRequestExecutionReopening(userOrPermissions) {
  return userHasPermission(userOrPermissions, REQUEST_EXECUTION_REOPENING_KEY);
}

function userCanApproveExecutionReopening(userOrPermissions) {
  return userHasPermission(userOrPermissions, APPROVE_EXECUTION_REOPENING_KEY);
}

module.exports = {
  REQUEST_EXECUTION_REOPENING_KEY,
  APPROVE_EXECUTION_REOPENING_KEY,
  userCanRequestExecutionReopening,
  userCanApproveExecutionReopening,
};
