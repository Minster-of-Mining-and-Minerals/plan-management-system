"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "governance", action: "configuration:view", description: "View clinical configuration center and dependency trees", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "governance", action: "configuration:create", description: "Create draft clinical configurations", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "governance", action: "configuration:update", description: "Modify draft clinical configurations", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "governance", action: "configuration:publish", description: "Validate and publish clinical configurations into production runtime", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "governance", action: "configuration:deprecate", description: "Deprecate published clinical configurations safely", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "governance", action: "configuration:audit", description: "View configuration governance audit trails and impact analysis", created_at: new Date(), updated_at: new Date() },
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
        "configuration:view",
        "configuration:create",
        "configuration:update",
        "configuration:publish",
        "configuration:deprecate",
        "configuration:audit",
      ],
    });
  },
};
