"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ensure all regional execution periods and annual versions marked as 'open' are unlocked
    await queryInterface.sequelize.query(`
      UPDATE regional_plan_versions
      SET is_locked = false
      WHERE version_kind IN ('execution_period', 'annual')
        AND execution_status = 'open'
        AND is_locked = true;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // No-op
  },
};
