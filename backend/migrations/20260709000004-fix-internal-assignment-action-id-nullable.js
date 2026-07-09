"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE internal_assignments
      ALTER COLUMN action_id DROP NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE internal_assignments
      ALTER COLUMN action_id SET NOT NULL
    `);
  },
};
