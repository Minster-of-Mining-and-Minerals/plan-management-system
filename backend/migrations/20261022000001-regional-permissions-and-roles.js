"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";
const REGIONAL_OFFICER_ROLE_ID = "20000000-0000-4000-8000-000000000002";
const REGIONAL_VIEWER_ROLE_ID = "20000000-0000-4000-8000-000000000003";

const REGIONAL_PERMISSIONS_CATALOG = [
  // Regional Workspace & Dashboard
  { resource: "regional_dashboard", action: "view", permission_tier: "standard" },
  // Regional Structures / Departments
  { resource: "regional_structures", action: "manage", permission_tier: "standard" },
  // Regional Users
  { resource: "regional_users", action: "create", permission_tier: "standard" },
  { resource: "regional_users", action: "read", permission_tier: "standard" },
  { resource: "regional_users", action: "update", permission_tier: "standard" },
  { resource: "regional_users", action: "delete", permission_tier: "standard" },
  { resource: "regional_users", action: "manage", permission_tier: "standard" },
  { resource: "regional_users", action: "assign_role", permission_tier: "standard" },
  // Regional Branding
  { resource: "regional_branding", action: "manage", permission_tier: "standard" },
];

async function ensurePermission(queryInterface, perm, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
    {
      replacements: { resource: perm.resource, action: perm.action },
      type: QueryTypes.SELECT,
    }
  );

  let permId;
  if (!existing || existing.length === 0) {
    permId = uuidv4();
    await queryInterface.bulkInsert("permissions", [
      {
        permission_id: permId,
        resource: perm.resource,
        action: perm.action,
        permission_tier: perm.permission_tier,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  } else {
    permId = existing[0].permission_id;
  }

  // Ensure granted to Super Admin
  const existingRolePerm = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existingRolePerm || existingRolePerm.length === 0) {
    await queryInterface.bulkInsert("role_permissions", [
      {
        role_permission_id: uuidv4(),
        role_id: SUPER_ADMIN_ROLE_ID,
        permission_id: permId,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  return permId;
}

async function ensureRoleWithPermissions(queryInterface, roleId, roleName, description, scope, permissionKeys, now) {
  const existingRole = await queryInterface.sequelize.query(
    `SELECT role_id FROM roles WHERE role_id = :roleId OR (LOWER(name) = LOWER(:name) AND scope = :scope) LIMIT 1`,
    {
      replacements: { roleId, name: roleName, scope },
      type: QueryTypes.SELECT,
    }
  );

  let actualRoleId = roleId;
  if (!existingRole || existingRole.length === 0) {
    await queryInterface.bulkInsert("roles", [
      {
        role_id: roleId,
        name: roleName,
        description,
        scope,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  } else {
    actualRoleId = existingRole[0].role_id;
  }

  for (const [resource, action] of permissionKeys) {
    const permRow = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
      {
        replacements: { resource, action },
        type: QueryTypes.SELECT,
      }
    );

    if (permRow && permRow.length > 0) {
      const permId = permRow[0].permission_id;
      const existingAssign = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: actualRoleId, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingAssign || existingAssign.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: actualRoleId,
            permission_id: permId,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Ensure partial unique index on roles for regional scope
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS roles_regional_name_unique
      ON roles (LOWER(name))
      WHERE scope = 'regional';
    `);

    // 2. Ensure all regional catalog permissions exist and are granted to Super Admin
    for (const perm of REGIONAL_PERMISSIONS_CATALOG) {
      await ensurePermission(queryInterface, perm, now);
    }

    // 3. Seed standard Regional Roles with dedicated regional permissions:
    // Regional Administrator: full administrative control within assigned region
    await ensureRoleWithPermissions(
      queryInterface,
      REGIONAL_ADMIN_ROLE_ID,
      "Regional Administrator",
      "Full administrative authority within the assigned regional operational workspace.",
      "regional",
      [
        ["regional_dashboard", "view"],
        ["regional_structures", "read"],
        ["regional_structures", "create"],
        ["regional_structures", "update"],
        ["regional_structures", "delete"],
        ["regional_structures", "manage"],
        ["regional_users", "read"],
        ["regional_users", "create"],
        ["regional_users", "update"],
        ["regional_users", "delete"],
        ["regional_users", "manage"],
        ["regional_users", "assign_role"],
        ["regional_branding", "read"],
        ["regional_branding", "update"],
        ["regional_branding", "manage"],
      ],
      now
    );

    // Regional Officer: operational role for regional departments
    await ensureRoleWithPermissions(
      queryInterface,
      REGIONAL_OFFICER_ROLE_ID,
      "Regional Officer",
      "Operational staff member within an assigned regional department.",
      "regional",
      [
        ["regional_dashboard", "view"],
        ["regional_structures", "read"],
        ["regional_users", "read"],
        ["regional_branding", "read"],
      ],
      now
    );

    // Regional Viewer: read-only access to regional workspace
    await ensureRoleWithPermissions(
      queryInterface,
      REGIONAL_VIEWER_ROLE_ID,
      "Regional Viewer",
      "Read-only visibility into regional dashboard, departments, and branding.",
      "regional",
      [
        ["regional_dashboard", "view"],
        ["regional_structures", "read"],
        ["regional_branding", "read"],
      ],
      now
    );
  },

  async down(queryInterface) {
    // Drop regional unique index
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS roles_regional_name_unique;
    `);

    // Clean up role permissions and roles
    const roleIds = [REGIONAL_ADMIN_ROLE_ID, REGIONAL_OFFICER_ROLE_ID, REGIONAL_VIEWER_ROLE_ID];
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions WHERE role_id IN (:roleIds);
       DELETE FROM roles WHERE role_id IN (:roleIds);`,
      { replacements: { roleIds } }
    );

    // Clean up permissions catalog
    for (const perm of REGIONAL_PERMISSIONS_CATALOG) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id IN (
          SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action)
        );
        DELETE FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action);`,
        {
          replacements: { resource: perm.resource, action: perm.action },
        }
      );
    }
  },
};
