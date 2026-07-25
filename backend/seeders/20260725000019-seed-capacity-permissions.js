"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "operations", action: "operations:capacity_view", description: "View enterprise hospital, department, and provider capacity", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:capacity_manage", description: "Manage enterprise capacity parameters and room/equipment registries", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:resource_allocate", description: "Allocate clinical staff and equipment resources across departments", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:forecast_view", description: "Access clinical workload and capacity demand forecasts", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:recommendation_view", description: "View operational capacity recommendations and action triggers", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:availability_view", description: "View real-time clinician availability and workload status", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:throughput_view", description: "View clinical throughput metrics (patients/hour, orders/hour)", created_at: new Date(), updated_at: new Date() },
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
        "operations:capacity_view",
        "operations:capacity_manage",
        "operations:resource_allocate",
        "operations:forecast_view",
        "operations:recommendation_view",
        "operations:availability_view",
        "operations:throughput_view",
      ],
    });
  },
};
