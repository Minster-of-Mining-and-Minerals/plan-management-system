"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_nodes", "target_allocation_mode", {
      type: Sequelize.ENUM("divisible", "lump"),
      allowNull: false,
      defaultValue: "divisible",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_nodes", "target_allocation_mode");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_nodes_target_allocation_mode";'
    );
  },
};
