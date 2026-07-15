"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionId = uuidv4();

    await queryInterface.bulkInsert(
      "permissions",
      [
        {
          permission_id: permissionId,
          resource: "plan",
          action: "publish_sector_aggregation",
          permission_tier: "special",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true }
    );

    const [existingPerm] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'plan' AND action = 'publish_sector_aggregation' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    const resolvedPermissionId = existingPerm?.permission_id ?? permissionId;

    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET permission_tier = 'special', updated_at = :now
       WHERE resource = 'plan' AND action = 'publish_sector_aggregation'`,
      { replacements: { now } }
    );

    const [existingRolePerm] = await queryInterface.sequelize.query(
      `SELECT role_permission_id FROM role_permissions
       WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
      {
        replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId: resolvedPermissionId },
        type: QueryTypes.SELECT,
      }
    );

    if (!existingRolePerm) {
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: SUPER_ADMIN_ROLE_ID,
          permission_id: resolvedPermissionId,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    const [existingPerm] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'plan' AND action = 'publish_sector_aggregation' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (existingPerm?.permission_id) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id = :permId`,
        { replacements: { permId: existingPerm.permission_id } }
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permission_group_permissions WHERE permission_id = :permId`,
        { replacements: { permId: existingPerm.permission_id } }
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE permission_id = :permId`,
        { replacements: { permId: existingPerm.permission_id } }
      );
    }
  },
};
