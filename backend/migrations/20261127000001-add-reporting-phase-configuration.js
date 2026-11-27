"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add reporting phase columns to national_reporting_period_configs
    const configTable = await queryInterface.describeTable("national_reporting_period_configs");

    if (!configTable.reporting_phase_open_days_before) {
      await queryInterface.addColumn("national_reporting_period_configs", "reporting_phase_open_days_before", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      });
    }

    if (!configTable.reporting_phase_close_days_after) {
      await queryInterface.addColumn("national_reporting_period_configs", "reporting_phase_close_days_after", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      });
    }

    if (!configTable.allow_grace_period) {
      await queryInterface.addColumn("national_reporting_period_configs", "allow_grace_period", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!configTable.phase_description) {
      await queryInterface.addColumn("national_reporting_period_configs", "phase_description", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    // Update default values per frequency
    await queryInterface.sequelize.query(`
      UPDATE national_reporting_period_configs
      SET reporting_phase_open_days_before = 5,
          reporting_phase_close_days_after = 5,
          phase_description = 'Opens 5 days before month ends (Day 25) through 5 days after month ends (Day 35)'
      WHERE frequency = 'monthly';
    `);

    await queryInterface.sequelize.query(`
      UPDATE national_reporting_period_configs
      SET reporting_phase_open_days_before = 15,
          reporting_phase_close_days_after = 15,
          phase_description = 'Opens 15 days before quarter ends through 15 days after quarter ends'
      WHERE frequency = 'quarterly';
    `);

    await queryInterface.sequelize.query(`
      UPDATE national_reporting_period_configs
      SET reporting_phase_open_days_before = 20,
          reporting_phase_close_days_after = 20,
          phase_description = 'Opens 20 days before semester ends through 20 days after semester ends'
      WHERE frequency = 'semi_annually';
    `);

    await queryInterface.sequelize.query(`
      UPDATE national_reporting_period_configs
      SET reporting_phase_open_days_before = 30,
          reporting_phase_close_days_after = 30,
          phase_description = 'Opens 30 days before fiscal year ends through 30 days after fiscal year ends'
      WHERE frequency = 'annually';
    `);

    // Ensure daily and weekly entries exist if not already present
    const [existingDaily] = await queryInterface.sequelize.query(
      `SELECT config_id FROM national_reporting_period_configs WHERE frequency = 'daily' LIMIT 1;`
    );
    if (!existingDaily || existingDaily.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO national_reporting_period_configs (
          config_id, frequency, display_title, division_count, divisions,
          reporting_phase_open_days_before, reporting_phase_close_days_after, allow_grace_period,
          phase_description, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'daily', 'Daily Reporting', 1, '[]'::jsonb,
          0, 1, true,
          'Active on the operating day with 1 day grace period for consolidation',
          NOW(), NOW()
        );
      `);
    }

    const [existingWeekly] = await queryInterface.sequelize.query(
      `SELECT config_id FROM national_reporting_period_configs WHERE frequency = 'weekly' LIMIT 1;`
    );
    if (!existingWeekly || existingWeekly.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO national_reporting_period_configs (
          config_id, frequency, display_title, division_count, divisions,
          reporting_phase_open_days_before, reporting_phase_close_days_after, allow_grace_period,
          phase_description, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'weekly', 'Weekly Reporting', 52, '[]'::jsonb,
          2, 3, true,
          'Opens 2 days before week ends through 3 days after week ends',
          NOW(), NOW()
        );
      `);
    }

    // 2. Add reporting_phase_override column to national_reporting_assignments
    const asgnTable = await queryInterface.describeTable("national_reporting_assignments");
    if (!asgnTable.reporting_phase_override) {
      await queryInterface.addColumn("national_reporting_assignments", "reporting_phase_override", {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      });
    }
  },

  async down(queryInterface) {
    const configTable = await queryInterface.describeTable("national_reporting_period_configs");
    if (configTable.reporting_phase_open_days_before) {
      await queryInterface.removeColumn("national_reporting_period_configs", "reporting_phase_open_days_before");
    }
    if (configTable.reporting_phase_close_days_after) {
      await queryInterface.removeColumn("national_reporting_period_configs", "reporting_phase_close_days_after");
    }
    if (configTable.allow_grace_period) {
      await queryInterface.removeColumn("national_reporting_period_configs", "allow_grace_period");
    }
    if (configTable.phase_description) {
      await queryInterface.removeColumn("national_reporting_period_configs", "phase_description");
    }

    const asgnTable = await queryInterface.describeTable("national_reporting_assignments");
    if (asgnTable.reporting_phase_override) {
      await queryInterface.removeColumn("national_reporting_assignments", "reporting_phase_override");
    }
  },
};
