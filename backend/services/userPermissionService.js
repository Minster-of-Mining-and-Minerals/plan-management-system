"use strict";

const { QueryTypes } = require("sequelize");
const db = require("../models");

const SUPER_ADMIN_ROLE = "Super Admin";

/** Sequelize include graph for roles + permission groups (used when resolving effective permissions). */
function permissionResolutionIncludes() {
  return [
    {
      model: db.Role,
      as: "roles",
      through: { attributes: [] },
      include: [
        {
          model: db.RolePermission,
          as: "rolePermissions",
          where: { is_active: true },
          required: false,
          include: [
            {
              model: db.Permission,
              as: "permission",
            },
          ],
        },
      ],
    },
    {
      model: db.PermissionGroup,
      as: "permissionGroups",
      through: { attributes: [] },
      include: [
        {
          model: db.Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
    },
  ];
}

function permissionMatches(perm, resource, action) {
  if (!perm || perm.is_active === false) return false;
  return (
    String(perm.resource).toLowerCase() === String(resource).toLowerCase() &&
    String(perm.action).toLowerCase() === String(action).toLowerCase()
  );
}

/**
 * Check effective permissions on a plain user object (roles + permission groups).
 */
function plainUserHasPermission(plainUser, resource, action) {
  if (!plainUser) return false;

  if ((plainUser.roles || []).some((r) => r.name === SUPER_ADMIN_ROLE)) {
    return true;
  }

  for (const role of plainUser.roles || []) {
    for (const rp of role.rolePermissions || []) {
      if (rp.is_active === false) continue;
      if (permissionMatches(rp.permission, resource, action)) {
        return true;
      }
    }
  }

  for (const group of plainUser.permissionGroups || []) {
    if (group.is_active === false) continue;
    for (const perm of group.permissions || []) {
      if (permissionMatches(perm, resource, action)) {
        return true;
      }
    }
  }

  return false;
}

async function userHasPermission(userId, resource, action, { accountType = "INTERNAL" } = {}) {
  const user = await db.User.findOne({
    where: {
      user_id: userId,
      is_active: true,
      ...(accountType ? { account_type: accountType } : {}),
    },
    include: permissionResolutionIncludes(),
  });

  if (!user) return false;
  return plainUserHasPermission(user.get({ plain: true }), resource, action);
}

/**
 * SQL-backed lookup of active users with a given resource:action (or Super Admin).
 * Preserves prior API: returns Sequelize User instances with optional extraIncludes.
 */
async function listUsersWithPermission(
  resource,
  action,
  { accountType = "INTERNAL", attributes, extraIncludes = [] } = {}
) {
  const sequelize = db.sequelize;
  const replacements = {
    resource: String(resource).toLowerCase(),
    action: String(action).toLowerCase(),
    accountType: accountType || null,
    superAdmin: SUPER_ADMIN_ROLE,
  };

  const accountClause = accountType
    ? "AND u.account_type = :accountType"
    : "";

  const rows = await sequelize.query(
    `
    SELECT DISTINCT u.user_id
    FROM users u
    WHERE u.is_active = true
      ${accountClause}
      AND (
        EXISTS (
          SELECT 1
          FROM user_roles ur
          INNER JOIN roles r ON r.role_id = ur.role_id
          WHERE ur.user_id = u.user_id
            AND COALESCE(ur.is_active, true) = true
            AND r.name = :superAdmin
        )
        OR EXISTS (
          SELECT 1
          FROM user_roles ur
          INNER JOIN role_permissions rp
            ON rp.role_id = ur.role_id AND COALESCE(rp.is_active, true) = true
          INNER JOIN permissions p ON p.permission_id = rp.permission_id
          WHERE ur.user_id = u.user_id
            AND COALESCE(ur.is_active, true) = true
            AND COALESCE(p.is_active, true) = true
            AND LOWER(p.resource) = :resource
            AND LOWER(p.action) = :action
        )
        OR EXISTS (
          SELECT 1
          FROM user_permission_groups upg
          INNER JOIN permission_groups pg
            ON pg.permission_group_id = upg.permission_group_id
           AND COALESCE(pg.is_active, true) = true
          INNER JOIN permission_group_permissions pgp
            ON pgp.permission_group_id = pg.permission_group_id
          INNER JOIN permissions p ON p.permission_id = pgp.permission_id
          WHERE upg.user_id = u.user_id
            AND COALESCE(p.is_active, true) = true
            AND LOWER(p.resource) = :resource
            AND LOWER(p.action) = :action
        )
      )
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const ids = rows.map((r) => r.user_id).filter(Boolean);
  if (!ids.length) return [];

  return db.User.findAll({
    where: { user_id: ids },
    attributes:
      attributes ||
      ["user_id", "full_name", "email", "phone_number", "profile_image"],
    include: extraIncludes.length ? [...extraIncludes] : undefined,
    order: [["full_name", "ASC"]],
  });
}

module.exports = {
  SUPER_ADMIN_ROLE,
  permissionResolutionIncludes,
  plainUserHasPermission,
  userHasPermission,
  listUsersWithPermission,
};
