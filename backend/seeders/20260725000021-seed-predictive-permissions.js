"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const actions = [
      "operations:prediction_view",
      "operations:prediction_manage",
      "operations:risk_view",
      "operations:recommendation_execute",
      "operations:model_manage",
      "operations:prediction_analytics",
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
      `DELETE FROM permissions WHERE resource = 'operations' AND action IN ('operations:prediction_view', 'operations:prediction_manage', 'operations:risk_view', 'operations:recommendation_execute', 'operations:model_manage', 'operations:prediction_analytics');`
    );
  },
};
