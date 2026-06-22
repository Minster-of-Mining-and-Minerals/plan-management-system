"use strict";

const NOTE_MANAGE = "notes:manage";

const NOTE_ACTION_PERMISSIONS = {
  view: "notes:view",
  create: "notes:create",
  update: "notes:update",
  delete: "notes:delete",
};

function normalizePermissions(permissions = []) {
  return permissions.map((p) => String(p).toLowerCase());
}

function userHasNotePermission(permissions, action) {
  const normalized = normalizePermissions(permissions);
  if (normalized.includes(NOTE_MANAGE)) return true;
  const required = NOTE_ACTION_PERMISSIONS[action];
  return required ? normalized.includes(required) : false;
}

function assertNotePermission(permissions, action) {
  if (!userHasNotePermission(permissions, action)) {
    const error = new Error(`You do not have permission to ${action} notes.`);
    error.status = 403;
    throw error;
  }
}

module.exports = {
  NOTE_MANAGE,
  NOTE_ACTION_PERMISSIONS,
  userHasNotePermission,
  assertNotePermission,
};
