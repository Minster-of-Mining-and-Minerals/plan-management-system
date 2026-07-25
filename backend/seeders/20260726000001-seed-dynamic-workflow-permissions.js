"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "workflow", action: "workflow:activity_view", description: "View clinical activity definitions and form mappings", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "workflow", action: "workflow:activity_manage", description: "Create and configure dynamic clinical activity definitions", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "workflow", action: "workflow:definition_manage", description: "Create and configure dynamic clinical workflow definitions", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "workflow", action: "workflow:intent_execute", description: "Submit dynamic forms and trigger clinical intent generation", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "workflow", action: "workflow:renderer_view", description: "Access dynamic clinical form rendering engine", created_at: new Date(), updated_at: new Date() },
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
        "workflow:activity_view",
        "workflow:activity_manage",
        "workflow:definition_manage",
        "workflow:intent_execute",
        "workflow:renderer_view",
      ],
    });
  },
};
