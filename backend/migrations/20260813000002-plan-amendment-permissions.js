"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const NEW_PERMISSIONS = [
  {
    resource: "plan",
    action: "request_amendment",
    permission_tier: "standard",
  },
  {
    resource: "plan",
    action: "approve_amendment",
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

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const perm of NEW_PERMISSIONS) {
      const permissionId = await ensurePermission(queryInterface, perm, now);
      await grantSuperAdmin(queryInterface, permissionId, now);
    }
  },

  async down(queryInterface) {
    const actions = ["request_amendment", "approve_amendment"];

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
  },
};
