"use strict";

const { userHasPermission } = require("./issuePermissionUtils");

function canConfigureIssueCategoryForm(userPermissions) {
  return userHasPermission(userPermissions, "issue_categories", "configure_form");
}

function assertCanConfigureIssueCategoryForm(userPermissions, data, { isCreate = false } = {}) {
  if (data?.form_config === undefined) return;

  if (canConfigureIssueCategoryForm(userPermissions)) return;

  const error = new Error("You do not have permission to configure issue category forms");
  error.statusCode = 403;
  throw error;
}

function stripFormConfigIfUnauthorized(userPermissions, data) {
  if (data?.form_config === undefined) return data;
  if (canConfigureIssueCategoryForm(userPermissions)) return data;

  const next = { ...data };
  delete next.form_config;
  return next;
}

module.exports = {
  canConfigureIssueCategoryForm,
  assertCanConfigureIssueCategoryForm,
  stripFormConfigIfUnauthorized,
};
