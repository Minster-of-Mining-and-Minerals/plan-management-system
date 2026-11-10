"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("national_reporting_assignments");
    if (!tableDesc.lock_overrides) {
      await queryInterface.addColumn("national_reporting_assignments", "lock_overrides", {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable("national_reporting_assignments");
    if (tableDesc.lock_overrides) {
      await queryInterface.removeColumn("national_reporting_assignments", "lock_overrides");
    }
  },
};
