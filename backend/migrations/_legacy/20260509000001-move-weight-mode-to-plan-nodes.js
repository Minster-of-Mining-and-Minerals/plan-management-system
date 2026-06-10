"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_nodes", "weight_mode", {
      type: Sequelize.ENUM("number", "percentage", "frequency"),
      allowNull: true,
    });

    await queryInterface.removeColumn("plan_rule_steps", "weight_mode");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_rule_steps", "weight_mode", {
      type: Sequelize.ENUM("number", "percentage", "frequency"),
      allowNull: true,
    });

    await queryInterface.removeColumn("plan_nodes", "weight_mode");
  },
};
