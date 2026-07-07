"use strict";

const { v4: uuidv4 } = require("uuid");

const ASSIGNMENT_ACTIONS = [
  {
    name: "Approval",
    code: "APPROVAL",
    description: "Responsible for approving the progress or completion of the task",
    is_approval: true,
    is_execution: false,
    is_reporting: false,
  },
  {
    name: "Execution",
    code: "EXECUTION",
    description: "Responsible for executing the task and achieving results",
    is_approval: false,
    is_execution: true,
    is_reporting: false,
  },
  {
    name: "Monitoring & Reporting",
    code: "MONITORING_REPORTING",
    description: "Responsible for tracking progress and providing periodic reports",
    is_approval: false,
    is_execution: false,
    is_reporting: true,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(
      `SELECT code FROM plan_assignment_actions WHERE code IN (:codes)`,
      {
        replacements: { codes: ASSIGNMENT_ACTIONS.map((action) => action.code) },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );
    const existingCodes = new Set(existing.map((row) => row.code));

    const actions = ASSIGNMENT_ACTIONS.filter((action) => !existingCodes.has(action.code)).map(
      (action) => ({
        assignment_action_id: uuidv4(),
        ...action,
        created_at: now,
        updated_at: now,
      })
    );

    if (actions.length > 0) {
      await queryInterface.bulkInsert("plan_assignment_actions", actions, {});
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "plan_assignment_actions",
      { code: ASSIGNMENT_ACTIONS.map((action) => action.code) },
      {}
    );
  },
};
