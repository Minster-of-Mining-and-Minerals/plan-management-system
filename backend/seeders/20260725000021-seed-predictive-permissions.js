"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "operations", action: "operations:prediction_view", description: "View predictive operations, risk scores, and AI forecasts", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:prediction_manage", description: "Generate, evaluate, and resolve predictive clinical operations cases", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:risk_view", description: "Access real-time clinical operational risk scores and risk factors", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:recommendation_execute", description: "Execute AI preventive actions and recommendation triggers", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:model_manage", description: "Manage machine learning model metadata registry and versions", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:prediction_analytics", description: "View predictive analytics, accuracy, and false positive metrics", created_at: new Date(), updated_at: new Date() },
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
        "operations:prediction_view",
        "operations:prediction_manage",
        "operations:risk_view",
        "operations:recommendation_execute",
        "operations:model_manage",
        "operations:prediction_analytics",
      ],
    });
  },
};
