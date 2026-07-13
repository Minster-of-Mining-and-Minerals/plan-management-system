"use strict";

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

async function listUsersWithPermission(
  resource,
  action,
  { accountType = "INTERNAL", attributes, extraIncludes = [] } = {}
) {
  const users = await db.User.findAll({
    where: {
      is_active: true,
      ...(accountType ? { account_type: accountType } : {}),
    },
    attributes:
      attributes ||
      ["user_id", "full_name", "email", "phone_number", "profile_image"],
    include: [...permissionResolutionIncludes(), ...extraIncludes],
    order: [["full_name", "ASC"]],
  });

  return users.filter((u) =>
    plainUserHasPermission(u.get({ plain: true }), resource, action)
  );
}

module.exports = {
  SUPER_ADMIN_ROLE,
  permissionResolutionIncludes,
  plainUserHasPermission,
  userHasPermission,
  listUsersWithPermission,
};
