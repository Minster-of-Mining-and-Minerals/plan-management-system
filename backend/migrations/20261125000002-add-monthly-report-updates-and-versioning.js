"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add allow_report_updates to company_production_assignments
    const assignmentsTable = await queryInterface.describeTable("company_production_assignments");

    if (!assignmentsTable.allow_report_updates) {
      await queryInterface.addColumn("company_production_assignments", "allow_report_updates", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // 2. Add versioning columns to company_production_reports
    const reportsTable = await queryInterface.describeTable("company_production_reports");

    if (!reportsTable.version_number) {
      await queryInterface.addColumn("company_production_reports", "version_number", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    if (!reportsTable.parent_report_id) {
      await queryInterface.addColumn("company_production_reports", "parent_report_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "company_production_reports",
          key: "report_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!reportsTable.revision_reason) {
      await queryInterface.addColumn("company_production_reports", "revision_reason", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("company_production_assignments", "allow_report_updates").catch(() => {});
    await queryInterface.removeColumn("company_production_reports", "revision_reason").catch(() => {});
    await queryInterface.removeColumn("company_production_reports", "parent_report_id").catch(() => {});
    await queryInterface.removeColumn("company_production_reports", "version_number").catch(() => {});
  },
};
