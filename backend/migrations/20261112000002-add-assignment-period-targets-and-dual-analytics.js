"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add period_targets to national_reporting_assignments
    const assignTable = await queryInterface.describeTable("national_reporting_assignments");
    if (!assignTable.period_targets) {
      await queryInterface.addColumn("national_reporting_assignments", "period_targets", {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      });
    }

    // 2. Add annual_target and annual_achievement_percent to national_published_records
    const pubTable = await queryInterface.describeTable("national_published_records");
    if (!pubTable.annual_target) {
      await queryInterface.addColumn("national_published_records", "annual_target", {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
    if (!pubTable.annual_achievement_percent) {
      await queryInterface.addColumn("national_published_records", "annual_achievement_percent", {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const assignTable = await queryInterface.describeTable("national_reporting_assignments");
    if (assignTable.period_targets) {
      await queryInterface.removeColumn("national_reporting_assignments", "period_targets");
    }

    const pubTable = await queryInterface.describeTable("national_published_records");
    if (pubTable.annual_target) {
      await queryInterface.removeColumn("national_published_records", "annual_target");
    }
    if (pubTable.annual_achievement_percent) {
      await queryInterface.removeColumn("national_published_records", "annual_achievement_percent");
    }
  },
};
