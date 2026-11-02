"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("regional_plan_nodes");
    if (!tableInfo.is_validation_required) {
      await queryInterface.addColumn("regional_plan_nodes", "is_validation_required", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("regional_plan_nodes");
    if (tableInfo.is_validation_required) {
      await queryInterface.removeColumn("regional_plan_nodes", "is_validation_required");
    }
  },
};

