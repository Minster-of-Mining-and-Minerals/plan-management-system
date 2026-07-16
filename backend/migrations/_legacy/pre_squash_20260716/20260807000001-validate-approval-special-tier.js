"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET permission_tier = 'special', updated_at = :now
       WHERE resource = 'plan' AND action = 'validate_approval'`,
      { replacements: { now } }
    );
  },

  async down(queryInterface) {
    const now = new Date();

    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET permission_tier = 'standard', updated_at = :now
       WHERE resource = 'plan' AND action = 'validate_approval'`,
      { replacements: { now } }
    );
  },
};
