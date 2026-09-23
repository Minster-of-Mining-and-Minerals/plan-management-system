"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("notes", "pin_order", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS notes_pin_order_idx ON notes (created_by, is_pinned, pin_order);
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("notes", "pin_order");
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS notes_pin_order_idx;
    `);
  },
};
