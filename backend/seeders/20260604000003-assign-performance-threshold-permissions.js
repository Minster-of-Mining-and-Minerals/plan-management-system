"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissions = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource = 'performance_color_thresholds'`,
      { type: QueryTypes.SELECT }
    );

    if (!permissions.length) return;

    for (const perm of permissions) {
      const existing = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId: perm.permission_id },
          type: QueryTypes.SELECT,
        }
      );

      if (existing.length > 0) continue;

      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: SUPER_ADMIN_ROLE_ID,
          permission_id: perm.permission_id,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE role_id = :roleId
       AND permission_id IN (
         SELECT permission_id FROM permissions WHERE resource = 'performance_color_thresholds'
       )`,
      { replacements: { roleId: SUPER_ADMIN_ROLE_ID } }
    );
  },
};
