"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      {
        id: uuidv4(),
        module: "clinical",
        action: "audit_view",
        description: "View standardized clinical audit trail events across domains",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "audit_export",
        description: "Export compliance audit reports for regulatory compliance",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "amend_request",
        description: "Request clinical record amendments for results or reports",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "amend_approve",
        description: "Approve or reject clinical record amendment requests",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        module: "clinical",
        action: "version_history_view",
        description: "Inspect immutable historical version snapshots of clinical records",
        created_at: new Date(),
        updated_at: new Date(),
      },
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
      action: ["audit_view", "audit_export", "amend_request", "amend_approve", "version_history_view"],
    });
  },
};
