"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { id: uuidv4(), module: "operations", action: "operations:incident_view", description: "View operational incidents and orchestration status", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:incident_manage", description: "Create, acknowledge, and resolve operational incidents", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:incident_assign", description: "Assign and reassign incident ownership across supervisors and executives", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:incident_execute", description: "Execute automated operational actions and recommendation playbooks", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:playbook_manage", description: "Manage operational response playbooks and step definitions", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:communication", description: "Send operational communications and escalation broadcasts", created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), module: "operations", action: "operations:incident_analytics", description: "View incident analytics, root causes, and mean resolution time metrics", created_at: new Date(), updated_at: new Date() },
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
        "operations:incident_view",
        "operations:incident_manage",
        "operations:incident_assign",
        "operations:incident_execute",
        "operations:playbook_manage",
        "operations:communication",
        "operations:incident_analytics",
      ],
    });
  },
};
