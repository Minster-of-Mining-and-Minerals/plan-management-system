"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const actions = [
      "careplan_view",
      "careplan_manage",
      "goal_manage",
      "task_assign",
      "outcome_record",
      "careteam_manage",
    ];

    const now = new Date();
    for (const action of actions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'clinical' AND action = '${action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: "clinical",
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
      `DELETE FROM permissions WHERE resource = 'clinical' AND action IN ('careplan_view', 'careplan_manage', 'goal_manage', 'task_assign', 'outcome_record', 'careteam_manage');`
    );
  },
};
