"use strict";

/**
 * Loads users with their roles, role permissions, permission groups and department
 * permission groups using flat queries, and caches the result briefly per user.
 *
 * Why: including roles->rolePermissions->permission AND permissionGroups->permissions in a
 * single Sequelize query multiplies the two branches (rows = rolePerms x groupPerms per user).
 * With ~700 role permissions per admin that produced ~180k joined rows for the user table and
 * blocked the Node event loop for seconds per call. Here each branch is loaded once per
 * distinct role/group, and the nested shape callers expect is rebuilt in memory.
 */

const { Op } = require("sequelize");
const { collectUserPermissionKeys } = require("./userPermissionsUtils");
const { loadDepartmentPermissionGroupsBatch } = require("./specialPermissionGroupUtils");

const CACHE_TTL_MS = Number(process.env.USER_ACCESS_CACHE_TTL_MS || 30000);
const CACHE_MAX_ENTRIES = 5000;

/** userId -> { expiresAt, user } (user is a plain object; treat as read-only) */
const accessGraphCache = new Map();

function toPlain(value) {
  return value && typeof value.toJSON === "function" ? value.toJSON() : value;
}

function readCache(userId, now) {
  const entry = accessGraphCache.get(userId);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    accessGraphCache.delete(userId);
    return null;
  }
  return entry.user;
}

function writeCache(userId, user, now) {
  if (accessGraphCache.size >= CACHE_MAX_ENTRIES) {
    accessGraphCache.clear();
  }
  accessGraphCache.set(userId, { expiresAt: now + CACHE_TTL_MS, user });
}

/** Drop cached access data for one user, or for everyone when no id is given. */
function clearUserAccessCache(userId) {
  if (userId) {
    accessGraphCache.delete(userId);
  } else {
    accessGraphCache.clear();
  }
}

let invalidationHooksRegistered = false;

/** Any change to role/permission/group links clears the cache so admin edits apply at once. */
function registerInvalidationHooks(db) {
  if (invalidationHooksRegistered) return;
  invalidationHooksRegistered = true;
  const modelNames = [
    "Role",
    "Permission",
    "RolePermission",
    "UserRoles",
    "PermissionGroup",
    "PermissionGroupPermission",
    "UserPermissionGroup",
    "InternalStructurePermissionGroup",
    "GovernmentStructurePermissionGroup",
  ];
  const hookNames = [
    "afterCreate",
    "afterUpdate",
    "afterDestroy",
    "afterBulkCreate",
    "afterBulkUpdate",
    "afterBulkDestroy",
    "afterUpsert",
  ];
  const clearAll = () => accessGraphCache.clear();
  for (const name of modelNames) {
    const model = db[name];
    if (!model || typeof model.addHook !== "function") continue;
    for (const hook of hookNames) {
      model.addHook(hook, "clearUserAccessCache", clearAll);
    }
  }
  if (db.User && typeof db.User.addHook === "function") {
    db.User.addHook("afterUpdate", "clearUserAccessCache", (user) => {
      if (user?.user_id) accessGraphCache.delete(user.user_id);
    });
    db.User.addHook("afterBulkUpdate", "clearUserAccessCache", clearAll);
    db.User.addHook("afterDestroy", "clearUserAccessCache", clearAll);
  }
}

async function fetchAccessGraphs(userIds, transaction) {
  // Required lazily: models/index loads utils that may require this module.
  const db = require("../models");
  registerInvalidationHooks(db);
  const { User, Role, PermissionGroup, RolePermission, Permission } = db;

  const users = await User.findAll({
    where: { user_id: { [Op.in]: userIds } },
    attributes: { exclude: ["password"] },
    include: [
      { model: Role, as: "roles", through: { attributes: [] } },
      { model: PermissionGroup, as: "permissionGroups", through: { attributes: [] } },
    ],
    transaction,
  });

  const roleIds = new Set();
  const groupIds = new Set();
  const departmentIds = new Set();
  for (const user of users) {
    for (const role of user.roles || []) roleIds.add(role.role_id);
    for (const group of user.permissionGroups || []) groupIds.add(group.permission_group_id);
    if (user.internal_structure_id) departmentIds.add(user.internal_structure_id);
  }

  const [rolePermissions, groups, departmentGroupMap] = await Promise.all([
    roleIds.size
      ? RolePermission.findAll({
          where: { role_id: { [Op.in]: [...roleIds] } },
          include: [
            {
              model: Permission,
              as: "permission",
              attributes: ["permission_id", "resource", "action", "is_active"],
            },
          ],
          transaction,
        })
      : [],
    groupIds.size
      ? PermissionGroup.findAll({
          where: { permission_group_id: { [Op.in]: [...groupIds] } },
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["permission_id", "resource", "action", "is_active"],
              through: { attributes: [] },
            },
          ],
          transaction,
        })
      : [],
    departmentIds.size
      ? loadDepartmentPermissionGroupsBatch([...departmentIds], { transaction })
      : new Map(),
  ]);

  const rolePermissionsByRole = new Map();
  for (const rp of rolePermissions) {
    const plain = toPlain(rp);
    if (!rolePermissionsByRole.has(plain.role_id)) rolePermissionsByRole.set(plain.role_id, []);
    rolePermissionsByRole.get(plain.role_id).push(plain);
  }

  const permissionsByGroup = new Map();
  for (const group of groups) {
    const plain = toPlain(group);
    permissionsByGroup.set(plain.permission_group_id, plain.permissions || []);
  }

  const result = new Map();
  for (const user of users) {
    const plain = toPlain(user);
    plain.roles = (plain.roles || []).map((role) => ({
      ...role,
      rolePermissions: rolePermissionsByRole.get(role.role_id) || [],
    }));
    plain.permissionGroups = (plain.permissionGroups || []).map((group) => ({
      ...group,
      permissions: permissionsByGroup.get(group.permission_group_id) || [],
    }));
    plain.departmentPermissionGroups = (
      (plain.internal_structure_id && departmentGroupMap.get(plain.internal_structure_id)) ||
      []
    ).map((group) => ({ ...toPlain(group) }));
    plain.permissions = collectUserPermissionKeys(plain);
    result.set(plain.user_id, plain);
  }
  return result;
}

/**
 * @param {string[]} userIds
 * @param {{ transaction?: object, useCache?: boolean }} [options]
 * @returns {Promise<Map<string, object>>} userId -> plain user with roles, permissionGroups,
 *   departmentPermissionGroups and `permissions` (lower-case "resource:action" keys).
 *   Returned objects are shared with the cache: clone before mutating.
 */
async function loadUserAccessGraphs(userIds, options = {}) {
  const { transaction = null, useCache = true } = options;
  const ids = [...new Set((userIds || []).filter(Boolean))];
  const result = new Map();
  if (ids.length === 0) return result;

  const now = Date.now();
  const missing = [];
  for (const id of ids) {
    const cached = useCache ? readCache(id, now) : null;
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    const fetched = await fetchAccessGraphs(missing, transaction);
    const writtenAt = Date.now();
    for (const [id, user] of fetched.entries()) {
      writeCache(id, user, writtenAt);
      result.set(id, user);
    }
  }

  return result;
}

module.exports = {
  loadUserAccessGraphs,
  clearUserAccessCache,
};
