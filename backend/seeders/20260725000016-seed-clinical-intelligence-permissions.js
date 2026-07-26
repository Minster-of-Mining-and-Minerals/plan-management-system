"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissions = [
      { action: "intelligence_view" },
      { action: "alert_manage" },
      { action: "rule_manage" },
      { action: "risk_view" },
      { action: "recommendation_manage" },
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
      `DELETE FROM permissions WHERE resource = 'clinical' AND action IN ('intelligence_view', 'alert_manage', 'rule_manage', 'risk_view', 'recommendation_manage');`
    );
  },
};
