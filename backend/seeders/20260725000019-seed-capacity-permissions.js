"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const actions = [
      "operations:capacity_view",
      "operations:capacity_manage",
      "operations:resource_allocate",
      "operations:forecast_view",
      "operations:recommendation_view",
      "operations:availability_view",
      "operations:throughput_view",
    ];

    const now = new Date();
    for (const action of actions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'operations' AND action = '${action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: "operations",
            action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'operations' AND action IN ('operations:capacity_view', 'operations:capacity_manage', 'operations:resource_allocate', 'operations:forecast_view', 'operations:recommendation_view', 'operations:availability_view', 'operations:throughput_view');`
    );
  },
};
