"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const actions = [
      "workflow:activity_view",
      "workflow:activity_manage",
      "workflow:definition_manage",
      "workflow:intent_execute",
      "workflow:renderer_view",
    ];

    const now = new Date();
    for (const action of actions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'workflow' AND action = '${action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: "workflow",
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
      `DELETE FROM permissions WHERE resource = 'workflow' AND action IN ('workflow:activity_view', 'workflow:activity_manage', 'workflow:definition_manage', 'workflow:intent_execute', 'workflow:renderer_view');`
    );
  },
};
