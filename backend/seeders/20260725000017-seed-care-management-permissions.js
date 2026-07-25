"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "clinical", action: "careplan_view", description: "View patient clinical care plans", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "clinical", action: "careplan_manage", description: "Create and manage clinical care plans", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "clinical", action: "goal_manage", description: "Add, update, and track clinical goals", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "clinical", action: "task_assign", description: "Assign and manage clinical tasks", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "clinical", action: "outcome_record", description: "Record and track patient clinical outcomes", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "clinical", action: "careteam_manage", description: "Manage care team members for a care plan", created_at: new Date(), updated_at: new Date() },
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
      action: ["careplan_view", "careplan_manage", "goal_manage", "task_assign", "outcome_record", "careteam_manage"],
    });
  },
};
