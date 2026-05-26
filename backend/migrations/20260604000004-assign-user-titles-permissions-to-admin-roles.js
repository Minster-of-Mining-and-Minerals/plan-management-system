"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const ADMIN_ROLE_NAMES = ["Super Admin", "Admin"];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [titlePerms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'user_titles' AND is_active = true`
    );

    if (!titlePerms.length) return;

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );

    const targetRoleIds = new Set([SUPER_ADMIN_ROLE_ID]);
    for (const role of roles) {
      if (ADMIN_ROLE_NAMES.includes(role.name)) {
        targetRoleIds.add(role.role_id);
      }
    }

    for (const roleId of targetRoleIds) {
      for (const perm of titlePerms) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions
           WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
          {
            replacements: {
              roleId,
              permissionId: perm.permission_id,
            },
          }
        );

        if (!existing.length) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: roleId,
              permission_id: perm.permission_id,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const [titlePerms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource = 'user_titles'`
    );
    const ids = titlePerms.map((p) => p.permission_id);
    if (!ids.length) return;

    await queryInterface.bulkDelete("role_permissions", {
      permission_id: { [Sequelize.Op.in]: ids },
    });
  },
};
