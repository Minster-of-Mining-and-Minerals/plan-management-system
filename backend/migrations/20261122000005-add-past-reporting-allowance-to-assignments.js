"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add allowance columns to company_production_assignments
    const assignmentsTable = await queryInterface.describeTable("company_production_assignments");

    if (!assignmentsTable.allow_past_reporting) {
      await queryInterface.addColumn("company_production_assignments", "allow_past_reporting", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!assignmentsTable.past_reporting_duration) {
      await queryInterface.addColumn("company_production_assignments", "past_reporting_duration", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      });
    }

    if (!assignmentsTable.past_reporting_unit) {
      await queryInterface.addColumn("company_production_assignments", "past_reporting_unit", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "days",
      });
    }

    // 2. Add target linkage & frequency metadata to company_production_reports
    const reportsTable = await queryInterface.describeTable("company_production_reports");

    if (!reportsTable.target_period_id) {
      await queryInterface.addColumn("company_production_reports", "target_period_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "company_production_targets",
          key: "target_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!reportsTable.reporting_frequency) {
      await queryInterface.addColumn("company_production_reports", "reporting_frequency", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "daily",
      });
    }

    if (!reportsTable.reporting_period_key) {
      await queryInterface.addColumn("company_production_reports", "reporting_period_key", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    // Create index on assignment_id and reporting_period_key
    await queryInterface.addIndex("company_production_reports", ["assignment_id", "reporting_period_key"], {
      name: "idx_company_reports_assignment_period_key",
    }).catch(() => {
      // Ignore if index already exists
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("company_production_reports", "idx_company_reports_assignment_period_key").catch(() => {});
    await queryInterface.removeColumn("company_production_reports", "reporting_period_key").catch(() => {});
    await queryInterface.removeColumn("company_production_reports", "reporting_frequency").catch(() => {});
    await queryInterface.removeColumn("company_production_reports", "target_period_id").catch(() => {});
    await queryInterface.removeColumn("company_production_assignments", "past_reporting_unit").catch(() => {});
    await queryInterface.removeColumn("company_production_assignments", "past_reporting_duration").catch(() => {});
    await queryInterface.removeColumn("company_production_assignments", "allow_past_reporting").catch(() => {});
  },
};
