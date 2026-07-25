"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "operations", action: "operations:view", description: "View Enterprise Clinical Operations Center", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:dashboard", description: "Access live hospital & department operational dashboards", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:analytics", description: "Access clinical operations analytics and workload metrics", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:executive", description: "Access executive summary and operational scores", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:queue", description: "Monitor enterprise clinical queues across departments", created_at: new Date(), updated_at: new Date() },
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
      action: ["operations:view", "operations:dashboard", "operations:analytics", "operations:executive", "operations:queue"],
    });
  },
};
