"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissionsToSeed = [
      { resource: "cashier_queue", action: "view" },
      { resource: "cashier_queue", action: "cashier_queue:view" },
      { resource: "cashier_session", action: "open" },
      { resource: "cashier_session", action: "close" },
      { resource: "cashier_session", action: "view" },
      { resource: "cashier_session", action: "cashier_session:open" },
      { resource: "cashier_session", action: "cashier_session:close" },
      { resource: "cashier_session", action: "cashier_session:view" },
      { resource: "cashier_payment", action: "create" },
      { resource: "cashier_payment", action: "view" },
      { resource: "cashier_payment", action: "cashier_payment:create" },
      { resource: "cashier_payment", action: "cashier_payment:view" },
      { resource: "appointment_billing", action: "view" },
      { resource: "appointment_billing", action: "create" },
      { resource: "appointment_billing", action: "update" },
      { resource: "appointment_billing", action: "delete" },
      { resource: "appointment_billing", action: "appointment_billing:create" },
      { resource: "appointment_billing", action: "appointment_billing:view" },
      { resource: "billing_collection", action: "send" },
      { resource: "billing_collection", action: "view" },
      { resource: "billing_collection", action: "billing_collection:send" },
      { resource: "billing_collection", action: "billing_collection:view" },
    ];

    const now = new Date();
    for (const perm of permissionsToSeed) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = '${perm.resource}' AND action = '${perm.action}';`
      );
      if (!existing || existing.length === 0) {
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

    // Link newly seeded permissions to permission groups
    const [groups] = await queryInterface.sequelize.query(`SELECT permission_group_id, name FROM permission_groups;`);
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource IN ('cashier_queue', 'cashier_session', 'cashier_payment', 'appointment_billing', 'billing_collection');`
    );

    for (const group of groups) {
      for (const perm of perms) {
        const [linked] = await queryInterface.sequelize.query(
          `SELECT permission_group_id FROM permission_group_permissions WHERE permission_group_id = '${group.permission_group_id}' AND permission_id = '${perm.permission_id}' LIMIT 1;`
        );
        if (!linked || linked.length === 0) {
          await queryInterface.bulkInsert("permission_group_permissions", [
            {
              permission_group_id: group.permission_group_id,
              permission_id: perm.permission_id,
              created_at: now,
            },
          ]);
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource IN ('cashier_queue', 'cashier_session', 'cashier_payment', 'appointment_billing', 'billing_collection');`
    );
  },
};
