"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const permissionsToSeed = [
      { resource: "tenant", action: "tenant:create" },
      { resource: "tenant", action: "tenant:update" },
      { resource: "facility", action: "facility:create" },
      { resource: "facility", action: "facility:manage" },
      { resource: "facility", action: "facility:configuration" },
    ];

    const now = new Date();
    for (const perm of permissionsToSeed) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = '${perm.resource}' AND action = '${perm.action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: perm.resource,
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
      `DELETE FROM permissions WHERE resource IN ('tenant', 'facility');`
    );
  },
};
