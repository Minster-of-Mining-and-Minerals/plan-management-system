"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const rows = await queryInterface.sequelize.query(
      `SELECT permission_id, action
       FROM permissions
       WHERE resource = 'plans' AND action IN ('approve', 'approve_plan')`,
      { type: QueryTypes.SELECT }
    );

    const approve = rows.find((row) => row.action === "approve");
    const approvePlan = rows.find((row) => row.action === "approve_plan");

    if (!approvePlan) {
      return;
    }

    if (approve) {
      const roleGrants = await queryInterface.sequelize.query(
        `SELECT DISTINCT role_id
         FROM role_permissions
         WHERE permission_id = :approvePlanId AND is_active = true`,
        {
          replacements: { approvePlanId: approvePlan.permission_id },
          type: QueryTypes.SELECT,
        }
      );

      for (const grant of roleGrants) {
        const existing = await queryInterface.sequelize.query(
          `SELECT role_permission_id
           FROM role_permissions
           WHERE role_id = :roleId AND permission_id = :approveId
           LIMIT 1`,
          {
            replacements: { roleId: grant.role_id, approveId: approve.permission_id },
            type: QueryTypes.SELECT,
          }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: grant.role_id,
              permission_id: approve.permission_id,
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
         WHERE permission_id = :approvePlanId`,
        {
          replacements: { approvePlanId: approvePlan.permission_id },
          type: QueryTypes.SELECT,
        }
      );

      for (const grant of groupGrants) {
        const existing = await queryInterface.sequelize.query(
          `SELECT permission_group_id
           FROM permission_group_permissions
           WHERE permission_group_id = :groupId AND permission_id = :approveId
           LIMIT 1`,
          {
            replacements: {
              groupId: grant.permission_group_id,
              approveId: approve.permission_id,
            },
            type: QueryTypes.SELECT,
          }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert("permission_group_permissions", [
            {
              permission_group_id: grant.permission_group_id,
              permission_id: approve.permission_id,
              created_at: now,
            },
          ]);
        }
      }
    }

    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions WHERE permission_id = :approvePlanId`,
      { replacements: { approvePlanId: approvePlan.permission_id } }
    );

    await queryInterface.sequelize.query(
      `DELETE FROM permission_group_permissions WHERE permission_id = :approvePlanId`,
      { replacements: { approvePlanId: approvePlan.permission_id } }
    );

    await queryInterface.bulkDelete("permissions", {
      resource: "plans",
      action: "approve_plan",
    });
  },

  async down(queryInterface) {
    const now = new Date();
    const permissionId = uuidv4();

    await queryInterface.bulkInsert("permissions", [
      {
        permission_id: permissionId,
        resource: "plans",
        action: "approve_plan",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
};
