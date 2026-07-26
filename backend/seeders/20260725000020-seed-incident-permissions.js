"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const actions = [
      "operations:incident_view",
      "operations:incident_manage",
      "operations:incident_assign",
      "operations:incident_execute",
      "operations:playbook_manage",
      "operations:communication",
      "operations:incident_analytics",
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
      `DELETE FROM permissions WHERE resource = 'operations' AND action IN ('operations:incident_view', 'operations:incident_manage', 'operations:incident_assign', 'operations:incident_execute', 'operations:playbook_manage', 'operations:communication', 'operations:incident_analytics');`
    );
  },
};
