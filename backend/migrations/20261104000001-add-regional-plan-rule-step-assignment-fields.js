"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("regional_plan_rule_steps");

    if (!tableInfo.requires_assignment) {
      await queryInterface.addColumn("regional_plan_rule_steps", "requires_assignment", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!tableInfo.assignment_requirement) {
      await queryInterface.addColumn("regional_plan_rule_steps", "assignment_requirement", {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "none",
      });
    }

    if (!tableInfo.allow_assignment) {
      await queryInterface.addColumn("regional_plan_rule_steps", "allow_assignment", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  down: async (queryInterface) => {
    const tableInfo = await queryInterface.describeTable("regional_plan_rule_steps");

    if (tableInfo.requires_assignment) {
      await queryInterface.removeColumn("regional_plan_rule_steps", "requires_assignment");
    }
    if (tableInfo.assignment_requirement) {
      await queryInterface.removeColumn("regional_plan_rule_steps", "assignment_requirement");
    }
    if (tableInfo.allow_assignment) {
      await queryInterface.removeColumn("regional_plan_rule_steps", "allow_assignment");
    }
  },
};

