"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      {
        id: uuidv4(),
        module: "clinical",
        action: "intelligence_view",
        description: "View unified patient intelligence snapshot and clinical insights",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "alert_manage",
        description: "Acknowledge, action, and dismiss clinical alerts",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "rule_manage",
        description: "Create and manage clinical decision support rules",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "risk_view",
        description: "View patient risk assessment scores and risk dashboards",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "recommendation_manage",
        description: "Accept or dismiss clinical recommendation alerts",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    for (const perm of permissions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE module = '${perm.module}' AND action = '${perm.action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [perm]);
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("permissions", {
      module: "clinical",
      action: ["intelligence_view", "alert_manage", "rule_manage", "risk_view", "recommendation_manage"],
    });
  },
};
