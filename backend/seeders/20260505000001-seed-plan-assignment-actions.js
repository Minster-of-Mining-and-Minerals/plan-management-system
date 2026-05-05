"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    const actions = [
      {
        assignment_action_id: uuidv4(),
        name: "Approval",
        code: "APPROVAL",
        description: "Responsible for approving the progress or completion of the task",
        is_approval: true,
        is_execution: false,
        is_reporting: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        assignment_action_id: uuidv4(),
        name: "Execution",
        code: "EXECUTION",
        description: "Responsible for executing the task and achieving results",
        is_approval: false,
        is_execution: true,
        is_reporting: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        assignment_action_id: uuidv4(),
        name: "Monitoring & Reporting",
        code: "MONITORING_REPORTING",
        description: "Responsible for tracking progress and providing periodic reports",
        is_approval: false,
        is_execution: false,
        is_reporting: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert("plan_assignment_actions", actions, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("plan_assignment_actions", null, {});
  },
};
