"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_plan_versions_version_kind" ADD VALUE IF NOT EXISTS 'execution_period';
    `);

    await queryInterface.addColumn("plan_versions", "period_label", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("plan_nodes", "period_target", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn("planning_configurations", "breakdown_mode", {
      type: Sequelize.ENUM("quarterly", "semi_annual", "custom"),
      allowNull: false,
      defaultValue: "quarterly",
    });

    await queryInterface.addColumn("planning_configurations", "custom_periods", {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("planning_configurations", "custom_periods");
    await queryInterface.removeColumn("planning_configurations", "breakdown_mode");
    await queryInterface.removeColumn("plan_nodes", "period_target");
    await queryInterface.removeColumn("plan_versions", "period_label");
  },
};
