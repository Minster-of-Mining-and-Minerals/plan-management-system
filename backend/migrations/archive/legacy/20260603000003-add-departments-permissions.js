"use strict";

const { v4: uuidv4 } = require("uuid");

const ACTIONS = ["create", "read", "update", "delete", "manage"];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const action of ACTIONS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions
         WHERE resource = 'departments' AND action = :action LIMIT 1`,
        { replacements: { action } }
      );

      if (!existing.length) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: "departments",
            action,
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
      resource: "departments",
      action: { [Sequelize.Op.in]: ACTIONS },
    });
  },
};
