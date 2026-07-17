"use strict";

const { v4: uuidv4 } = require("uuid");
const { safeAddColumn, safeRemoveColumn } = require("./_helpers/migrationUtils");

const ADMIN_ROLE_NAMES = ["Super Admin", "Admin"];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await safeAddColumn(queryInterface, "users", "token_version", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    const existing = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'audit_log' AND action = 'view' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let permissionId = existing[0]?.permission_id;
    if (!permissionId) {
      permissionId = uuidv4();
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: permissionId,
          resource: "audit_log",
          action: "view",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const roles = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const role of roles) {
      if (!ADMIN_ROLE_NAMES.includes(role.name)) continue;
      const linked = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId AND is_active = true LIMIT 1`,
        {
          replacements: { roleId: role.role_id, permissionId },
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      if (linked.length) continue;
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: role.role_id,
          permission_id: permissionId,
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
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = 'audit_log' AND action = 'view'
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'audit_log' AND action = 'view'`
    );
    await safeRemoveColumn(queryInterface, "users", "token_version");
  },
};
