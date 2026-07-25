"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "orders", action: "order_definition:view", description: "View clinical order definitions and dynamic templates", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "orders", action: "order_definition:manage", description: "Create and publish configuration-driven clinical order definitions", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "orders", action: "order_definition:designer", description: "Access Clinical Order Designer builder interface", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "orders", action: "order_definition:version_manage", description: "Manage order definition version snapshotting and publishing", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "orders", action: "order_definition:execute_render", description: "Render dynamic clinical order forms for execution and fulfillment", created_at: new Date(), updated_at: new Date() },
    ];

    for (const perm of permissions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE action = '${perm.action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [perm]);
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("permissions", {
      action: [
        "order_definition:view",
        "order_definition:manage",
        "order_definition:designer",
        "order_definition:version_manage",
        "order_definition:execute_render",
      ],
    });
  },
};
