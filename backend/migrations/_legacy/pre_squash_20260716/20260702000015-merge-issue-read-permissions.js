"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const permissions = await queryInterface.sequelize.query(
      `SELECT permission_id, action
       FROM permissions
       WHERE resource = 'issues' AND action IN ('read', 'read_own', 'read_assigned', 'read_all')`,
      { type: QueryTypes.SELECT }
    );

    const readPerm = permissions.find((row) => row.action === "read");
    const legacyPerms = permissions.filter((row) =>
      ["read_own", "read_assigned"].includes(row.action)
    );

    if (!readPerm || legacyPerms.length === 0) {
      return;
    }

    for (const legacy of legacyPerms) {
      const roleGrants = await queryInterface.sequelize.query(
        `SELECT DISTINCT role_id
         FROM role_permissions
         WHERE permission_id = :legacyId AND is_active = true`,
        {
          replacements: { legacyId: legacy.permission_id },
          type: QueryTypes.SELECT,
        }
      );

      for (const grant of roleGrants) {
        const existing = await queryInterface.sequelize.query(
          `SELECT role_permission_id
           FROM role_permissions
           WHERE role_id = :roleId AND permission_id = :readId
           LIMIT 1`,
          {
            replacements: { roleId: grant.role_id, readId: readPerm.permission_id },
            type: QueryTypes.SELECT,
          }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: grant.role_id,
              permission_id: readPerm.permission_id,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }

      const groupGrants = await queryInterface.sequelize.query(
        `SELECT DISTINCT permission_group_id
         FROM permission_group_permissions
         WHERE permission_id = :legacyId`,
        {
          replacements: { legacyId: legacy.permission_id },
          type: QueryTypes.SELECT,
        }
      );

      for (const grant of groupGrants) {
        const existing = await queryInterface.sequelize.query(
          `SELECT permission_group_id
           FROM permission_group_permissions
           WHERE permission_group_id = :groupId AND permission_id = :readId
           LIMIT 1`,
          {
            replacements: {
              groupId: grant.permission_group_id,
              readId: readPerm.permission_id,
            },
            type: QueryTypes.SELECT,
          }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert("permission_group_permissions", [
            {
              permission_group_id: grant.permission_group_id,
              permission_id: readPerm.permission_id,
              created_at: now,
            },
          ]);
        }
      }

      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id = :legacyId`,
        { replacements: { legacyId: legacy.permission_id } }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM permission_group_permissions WHERE permission_id = :legacyId`,
        { replacements: { legacyId: legacy.permission_id } }
      );

      await queryInterface.bulkDelete("permissions", {
        permission_id: legacy.permission_id,
      });
    }
  },

  async down() {
    // Legacy permissions are not restored automatically.
  },
};
