"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_rule_steps", "requires_contribution_weight", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("plan_nodes", "contribution_weight", {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_nodes", "contribution_weight");
    await queryInterface.removeColumn("plan_rule_steps", "requires_contribution_weight");
  },
};
