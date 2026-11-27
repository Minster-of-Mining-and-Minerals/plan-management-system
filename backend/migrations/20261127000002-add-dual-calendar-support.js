"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tablesWithCalendarSystem = [
      "planning_configurations",
      "regional_planning_configurations",
      "plan_versions",
      "regional_plan_versions",
      "national_reporting_period_configs",
      "national_reporting_requirements",
    ];

    for (const tableName of tablesWithCalendarSystem) {
      const desc = await queryInterface.describeTable(tableName);
      if (!desc.calendar_system) {
        await queryInterface.addColumn(tableName, "calendar_system", {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: "GC",
        });
      }
    }

    const assignmentDesc = await queryInterface.describeTable("national_reporting_assignments");
    if (!assignmentDesc.calendar_system_override) {
      await queryInterface.addColumn("national_reporting_assignments", "calendar_system_override", {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const tablesWithCalendarSystem = [
      "planning_configurations",
      "regional_planning_configurations",
      "plan_versions",
      "regional_plan_versions",
      "national_reporting_period_configs",
      "national_reporting_requirements",
    ];

    for (const tableName of tablesWithCalendarSystem) {
      const desc = await queryInterface.describeTable(tableName);
      if (desc.calendar_system) {
        await queryInterface.removeColumn(tableName, "calendar_system");
      }
    }

    const assignmentDesc = await queryInterface.describeTable("national_reporting_assignments");
    if (assignmentDesc.calendar_system_override) {
      await queryInterface.removeColumn("national_reporting_assignments", "calendar_system_override");
    }
  },
};
