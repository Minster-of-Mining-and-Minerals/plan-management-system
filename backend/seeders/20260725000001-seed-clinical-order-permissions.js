"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const ORDER_PERMISSIONS = [
  { resource: "orders", action: "create" },
  { resource: "orders", action: "view" },
  { resource: "orders", action: "accept" },
  { resource: "orders", action: "execute" },
  { resource: "orders", action: "result_create" },
  { resource: "orders", action: "result_verify" },
  { resource: "orders", action: "result_review" },
];

const ROLE_ASSIGNMENTS = {
  Doctor: ["create", "view", "accept", "execute", "result_create", "result_verify", "result_review"],
  Nurse: ["create", "view", "execute", "result_create"],
  Admin: ["create", "view", "accept", "execute", "result_create", "result_verify", "result_review"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // 1. Seed permissions
    for (const perm of ORDER_PERMISSIONS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: { resource: perm.resource, action: perm.action } }
      );

      if (!existing.length) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: perm.resource,
            action: perm.action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    // 2. Assign to roles
    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles`
    );

    for (const role of roles) {
      const allowedActions =
        role.role_id === SUPER_ADMIN_ROLE_ID
          ? ORDER_PERMISSIONS.map((p) => p.action)
          : ROLE_ASSIGNMENTS[role.name] || [];

      if (!allowedActions.length) continue;

      const [permRows] = await queryInterface.sequelize.query(
        `SELECT permission_id, action FROM permissions WHERE resource = 'orders' AND action IN (:actions)`,
        { replacements: { actions: allowedActions } }
      );

      for (const perm of permRows) {
        const [junction] = await queryInterface.sequelize.query(
          `SELECT role_id FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id LIMIT 1`,
          {
            replacements: {
              role_id: role.role_id,
              permission_id: perm.permission_id,
            },
          }
        );

        if (!junction.length) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: role.role_id,
              permission_id: perm.permission_id,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }
  },

  async down(queryInterface) {
    const [permRows] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource = 'orders'`
    );
    const ids = permRows.map((p) => p.permission_id);

    if (ids.length) {
      await queryInterface.bulkDelete("role_permissions", {
        permission_id: ids,
      });
      await queryInterface.bulkDelete("permissions", {
        permission_id: ids,
      });
    }
  },
};
