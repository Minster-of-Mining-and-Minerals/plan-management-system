"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface) => {
    const actions = [
      "order_definition:view",
      "order_definition:manage",
      "order_definition:designer",
      "order_definition:version_manage",
      "order_definition:execute_render",
    ];

    const now = new Date();
    for (const action of actions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'orders' AND action = '${action}';`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: "orders",
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
      `DELETE FROM permissions WHERE resource = 'orders' AND action IN ('order_definition:view', 'order_definition:manage', 'order_definition:designer', 'order_definition:version_manage', 'order_definition:execute_render');`
    );
  },
};
