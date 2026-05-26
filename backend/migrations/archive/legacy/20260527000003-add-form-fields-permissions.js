"use strict";

const { v4: uuidv4 } = require("uuid");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [
      { resource: "form_fields", action: "create" },
      { resource: "form_fields", action: "read" },
      { resource: "form_fields", action: "update" },
      { resource: "form_fields", action: "delete" },
    ];

    const permissions = rows.map((r) => ({
      permission_id: uuidv4(),
      resource: r.resource,
      action: r.action,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("permissions", permissions);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permissions", {
      resource: "form_fields",
      action: { [Sequelize.Op.in]: ["create", "read", "update", "delete"] },
    });
  },
};
