"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add reporting method controls to regions table
    const regionTableInfo = await queryInterface.describeTable("regions");

    if (!regionTableInfo.national_reporting_method) {
      await queryInterface.addColumn("regions", "national_reporting_method", {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "node_mapping",
      });
    }

    if (!regionTableInfo.form_reporting_active) {
      await queryInterface.addColumn("regions", "form_reporting_active", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!regionTableInfo.form_reporting_start_date) {
      await queryInterface.addColumn("regions", "form_reporting_start_date", {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    if (!regionTableInfo.form_reporting_end_date) {
      await queryInterface.addColumn("regions", "form_reporting_end_date", {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    if (!regionTableInfo.form_reporting_notes) {
      await queryInterface.addColumn("regions", "form_reporting_notes", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // 2. Adjust national_published_records table to support direct form submissions
    await queryInterface.sequelize.query(
      'ALTER TABLE "national_published_records" ALTER COLUMN "mapping_id" DROP NOT NULL;'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE "national_published_records" ALTER COLUMN "regional_plan_node_id" DROP NOT NULL;'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE "national_published_records" ALTER COLUMN "regional_plan_version_id" DROP NOT NULL;'
    );

    const publishedTableInfo = await queryInterface.describeTable("national_published_records");
    if (!publishedTableInfo.submission_method) {
      await queryInterface.addColumn("national_published_records", "submission_method", {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "node_mapping",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert regions table changes
    const regionTableInfo = await queryInterface.describeTable("regions");
    if (regionTableInfo.national_reporting_method) {
      await queryInterface.removeColumn("regions", "national_reporting_method");
    }
    if (regionTableInfo.form_reporting_active) {
      await queryInterface.removeColumn("regions", "form_reporting_active");
    }
    if (regionTableInfo.form_reporting_start_date) {
      await queryInterface.removeColumn("regions", "form_reporting_start_date");
    }
    if (regionTableInfo.form_reporting_end_date) {
      await queryInterface.removeColumn("regions", "form_reporting_end_date");
    }
    if (regionTableInfo.form_reporting_notes) {
      await queryInterface.removeColumn("regions", "form_reporting_notes");
    }

    // Revert national_published_records table changes
    const publishedTableInfo = await queryInterface.describeTable("national_published_records");
    if (publishedTableInfo.submission_method) {
      await queryInterface.removeColumn("national_published_records", "submission_method");
    }
  },
};
