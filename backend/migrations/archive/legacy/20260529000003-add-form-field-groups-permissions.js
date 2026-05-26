"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [
      { resource: "form_field_groups", action: "create" },
      { resource: "form_field_groups", action: "read" },
      { resource: "form_field_groups", action: "update" },
      { resource: "form_field_groups", action: "delete" },
    ];

    for (const row of rows) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions
         WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: row }
      );

      if (!existing.length) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: row.resource,
            action: row.action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permissions", {
      resource: "form_field_groups",
      action: { [Sequelize.Op.in]: ["create", "read", "update", "delete"] },
    });
  },
};
