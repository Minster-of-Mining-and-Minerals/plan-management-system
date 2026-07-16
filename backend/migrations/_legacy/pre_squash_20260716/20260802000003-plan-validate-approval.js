"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_plan_nodes_period_actual_status" ADD VALUE IF NOT EXISTS 'validated';
    `);

    await queryInterface.addColumn("plan_nodes", "period_actual_validated_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "period_actual_validated_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    const now = new Date();
    const permissionId = uuidv4();

    await queryInterface.bulkInsert(
      "permissions",
      [
        {
          permission_id: permissionId,
          resource: "plan",
          action: "validate_approval",
          permission_tier: "standard",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true }
    );

    const [existingPerm] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'plan' AND action = 'validate_approval' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    const resolvedPermissionId = existingPerm?.permission_id ?? permissionId;

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
    await queryInterface.removeColumn("plan_nodes", "period_actual_validated_by");
    await queryInterface.removeColumn("plan_nodes", "period_actual_validated_at");
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'plan' AND action = 'validate_approval'`
    );
  },
};
