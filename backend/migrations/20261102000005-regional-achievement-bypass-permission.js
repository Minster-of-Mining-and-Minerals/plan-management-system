"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";

const NEW_PERMISSIONS = [
  {
    resource: "regional_plans",
    action: "bypass_achievement_assignment",
    permission_tier: "special",
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const perm of NEW_PERMISSIONS) {
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

      // Grant to Super Admin
      const existingSuperAdminAssign = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingSuperAdminAssign || existingSuperAdminAssign.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: SUPER_ADMIN_ROLE_ID,
            permission_id: permId,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      // Grant to Regional Admin
      const existingRegAdminAssign = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: REGIONAL_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingRegAdminAssign || existingRegAdminAssign.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: REGIONAL_ADMIN_ROLE_ID,
            permission_id: permId,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    for (const perm of NEW_PERMISSIONS) {
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action)`,
        {
          replacements: { resource: perm.resource, action: perm.action },
        }
      );
    }
  },
};
