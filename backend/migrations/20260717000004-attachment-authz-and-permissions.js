"use strict";

const { v4: uuidv4 } = require("uuid");
const { safeAddColumn, safeAddIndex, safeRemoveColumn, safeRemoveIndex } = require("./_helpers/migrationUtils");

const ADMIN_ROLE_NAMES = ["Super Admin", "Admin"];

const ATTACHMENT_PERMS = [
  { action: "create", description: "Upload attachments" },
  { action: "read", description: "List/download accessible attachments" },
  { action: "delete", description: "Delete own or managed attachments" },
  { action: "manage", description: "Full attachment administration" },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await safeAddColumn(queryInterface, "attachments", "resource_type", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await safeAddColumn(queryInterface, "attachments", "resource_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await safeAddColumn(queryInterface, "attachments", "patient_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await safeAddIndex(queryInterface, "attachments", ["resource_type", "resource_id"], {
      name: "attachments_resource_idx",
    });
    await safeAddIndex(queryInterface, "attachments", ["patient_id"], {
      name: "attachments_patient_id_idx",
    });
    await safeAddIndex(queryInterface, "attachments", ["uploaded_by"], {
      name: "attachments_uploaded_by_idx",
    });

    for (const perm of ATTACHMENT_PERMS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions
         WHERE resource = 'attachments' AND action = :action LIMIT 1`,
        {
          replacements: { action: perm.action },
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      let permissionId = existing[0]?.permission_id;
      if (!permissionId) {
        permissionId = uuidv4();
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: permissionId,
            resource: "attachments",
            action: perm.action,
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
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions WHERE resource = 'attachments'
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM permission_group_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions WHERE resource = 'attachments'
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'attachments'`
    );

    await safeRemoveIndex(queryInterface, "attachments", "attachments_resource_idx");
    await safeRemoveIndex(queryInterface, "attachments", "attachments_patient_id_idx");
    await safeRemoveIndex(queryInterface, "attachments", "attachments_uploaded_by_idx");
    await safeRemoveColumn(queryInterface, "attachments", "patient_id");
    await safeRemoveColumn(queryInterface, "attachments", "resource_id");
    await safeRemoveColumn(queryInterface, "attachments", "resource_type");
  },
};
