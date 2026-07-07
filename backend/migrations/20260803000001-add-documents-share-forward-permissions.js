"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const SHARE_FORWARD_PERMISSIONS = [
  { resource: "documents", action: "share" },
  { resource: "documents", action: "forward" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const perm of SHARE_FORWARD_PERMISSIONS) {
      try {
        await queryInterface.bulkInsert(
          "permissions",
          [
            {
              permission_id: uuidv4(),
              resource: perm.resource,
              action: perm.action,
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
    }

    const seeded = await queryInterface.sequelize.query(
      `SELECT permission_id, resource, action FROM permissions
       WHERE resource = 'documents' AND action IN ('share', 'forward')`,
      { type: QueryTypes.SELECT }
    );

    for (const perm of seeded) {
      const roleExists = await queryInterface.sequelize.query(
        `SELECT role_id FROM roles WHERE role_id = :roleId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID },
          type: QueryTypes.SELECT,
        }
      );

      if (roleExists.length === 0) {
        continue;
      }

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
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = 'documents' AND action IN ('share', 'forward')
       )`
    );
    await queryInterface.bulkDelete("permissions", {
      resource: "documents",
      action: ["share", "forward"],
    });
  },
};
