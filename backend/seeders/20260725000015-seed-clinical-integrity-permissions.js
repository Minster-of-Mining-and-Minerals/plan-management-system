"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { action: "audit_view" },
      { action: "audit_export" },
      { action: "amend_request" },
      { action: "amend_approve" },
      { action: "version_history_view" },
    ];

    const now = new Date();
    for (const perm of permissions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'clinical' AND action = '${perm.action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: "clinical",
            action: perm.action,
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
      `DELETE FROM permissions WHERE resource = 'clinical' AND action IN ('audit_view', 'audit_export', 'amend_request', 'amend_approve', 'version_history_view');`
    );
  },
};
