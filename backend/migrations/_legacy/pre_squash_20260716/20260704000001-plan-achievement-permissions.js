"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const NEW_PERMISSIONS = [
  {
    resource: "plan",
    action: "execute_achievement",
    permission_tier: "standard",
  },
  {
    resource: "plan",
    action: "approve_achievement",
    permission_tier: "standard",
  },
];

async function ensurePermission(queryInterface, perm, now) {
  try {
    await queryInterface.bulkInsert(
      "permissions",
      [
        {
          permission_id: uuidv4(),
          resource: perm.resource,
          action: perm.action,
          permission_tier: perm.permission_tier,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true }
    );
  } catch (error) {
    if (error.name !== "SequelizeUniqueConstraintError") {
      throw error;
    }
  }

  await queryInterface.sequelize.query(
    `UPDATE permissions
     SET permission_tier = :tier, is_active = true, updated_at = :now
     WHERE resource = :resource AND action = :action`,
    {
      replacements: {
        tier: perm.permission_tier,
        now,
        resource: perm.resource,
        action: perm.action,
      },
    }
  );

  const [row] = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions
     WHERE resource = :resource AND action = :action LIMIT 1`,
    {
      replacements: { resource: perm.resource, action: perm.action },
      type: QueryTypes.SELECT,
    }
  );

  return row?.permission_id ?? null;
}

async function grantSuperAdmin(queryInterface, permissionId, now) {
  if (!permissionId) return;

  const existing = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions
     WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId: permissionId },
      type: QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) return;

  await queryInterface.bulkInsert("role_permissions", [
    {
      role_permission_id: uuidv4(),
      role_id: SUPER_ADMIN_ROLE_ID,
      permission_id: permissionId,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
}

async function migrateGrants(queryInterface, fromPermissionId, toPermissionId, now) {
  if (!fromPermissionId || !toPermissionId || fromPermissionId === toPermissionId) {
    return;
  }

  const roleGrants = await queryInterface.sequelize.query(
    `SELECT DISTINCT role_id FROM role_permissions
     WHERE permission_id = :fromId AND is_active = true`,
    { replacements: { fromId: fromPermissionId }, type: QueryTypes.SELECT }
  );

  for (const grant of roleGrants) {
    const existing = await queryInterface.sequelize.query(
      `SELECT role_permission_id FROM role_permissions
       WHERE role_id = :roleId AND permission_id = :toId LIMIT 1`,
      {
        replacements: { roleId: grant.role_id, toId: toPermissionId },
        type: QueryTypes.SELECT,
      }
    );

    if (existing.length > 0) continue;

    await queryInterface.bulkInsert("role_permissions", [
      {
        role_permission_id: uuidv4(),
        role_id: grant.role_id,
        permission_id: toPermissionId,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  const groupGrants = await queryInterface.sequelize.query(
    `SELECT DISTINCT permission_group_id FROM permission_group_permissions
     WHERE permission_id = :fromId`,
    { replacements: { fromId: fromPermissionId }, type: QueryTypes.SELECT }
  );

  for (const grant of groupGrants) {
    const existing = await queryInterface.sequelize.query(
      `SELECT permission_group_id FROM permission_group_permissions
       WHERE permission_group_id = :groupId AND permission_id = :toId LIMIT 1`,
      {
        replacements: { groupId: grant.permission_group_id, toId: toPermissionId },
        type: QueryTypes.SELECT,
      }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert("permission_group_permissions", [
        {
          permission_group_id: grant.permission_group_id,
          permission_id: toPermissionId,
          created_at: now,
        },
      ]);
    }
  }

  await queryInterface.sequelize.query(
    `DELETE FROM role_permissions WHERE permission_id = :fromId`,
    { replacements: { fromId: fromPermissionId } }
  );

  await queryInterface.sequelize.query(
    `DELETE FROM permission_group_permissions WHERE permission_id = :fromId`,
    { replacements: { fromId: fromPermissionId } }
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionIds = {};

    for (const perm of NEW_PERMISSIONS) {
      permissionIds[perm.action] = await ensurePermission(queryInterface, perm, now);
      await grantSuperAdmin(queryInterface, permissionIds[perm.action], now);
    }

    const [legacyExecute] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'plans' AND action = 'execute_plan' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (legacyExecute?.permission_id) {
      await migrateGrants(
        queryInterface,
        legacyExecute.permission_id,
        permissionIds.execute_achievement,
        now
      );

      await queryInterface.bulkDelete("permissions", {
        resource: "plans",
        action: "execute_plan",
      });
    }
  },

  async down(queryInterface) {
    const actions = ["execute_achievement", "approve_achievement"];

    for (const action of actions) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions
         WHERE permission_id IN (
           SELECT permission_id FROM permissions
           WHERE resource = 'plan' AND action = :action
         )`,
        { replacements: { action } }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM permission_group_permissions
         WHERE permission_id IN (
           SELECT permission_id FROM permissions
           WHERE resource = 'plan' AND action = :action
         )`,
        { replacements: { action } }
      );

      await queryInterface.bulkDelete("permissions", {
        resource: "plan",
        action,
      });
    }

    const now = new Date();
    try {
      await queryInterface.bulkInsert(
        "permissions",
        [
          {
            permission_id: uuidv4(),
            resource: "plans",
            action: "execute_plan",
            permission_tier: "standard",
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ],
        { ignoreDuplicates: true }
      );
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError") {
        throw error;
      }
    }
  },
};
