"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create short_term_plan_configurations table
    await queryInterface.createTable("short_term_plan_configurations", {
      configuration_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      duration_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      subdivision_mode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "weekly_4_per_month",
      },
      reporting_window_before_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      reporting_window_after_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      allow_past_reporting: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      require_evidence_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // 2. Add configuration_id and duration_days to short_term_plans
    await queryInterface.addColumn("short_term_plans", "configuration_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "short_term_plan_configurations", key: "configuration_id" },
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("short_term_plans", "duration_days", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100,
    });

    // 3. Seed default 100-day configuration matching existing structure
    const defaultConfId = "c1000000-0000-4000-8000-000000000001";
    await queryInterface.bulkInsert("short_term_plan_configurations", [
      {
        configuration_id: defaultConfId,
        title: "የ100 ቀን ዕቅድ መደበኛ ውቅር (100-Day Standard Action Plan Configuration)",
        code: "CONF-100D-WEEKLY-4",
        description: "መደበኛ የ100 ቀን የድርጊት መርሃ ግብር ውቅር፤ በየወሩ 4 ሳምንታት ክፍፍል እና -3 እስከ +5 ቀናት የሪፖርት ማቅረቢያ ጊዜ",
        duration_days: 100,
        subdivision_mode: "weekly_4_per_month",
        reporting_window_before_days: 3,
        reporting_window_after_days: 5,
        allow_past_reporting: false,
        require_evidence_default: false,
        is_default: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // 4. Map existing seeded plan (EGSI) to the new configuration and exact Ethiopian Geological Survey title
    // Existing plan ID: 476e2690-d7c0-4bcf-84bc-9b9fb72ed8da
    // Geological Survey sector ID: 10000000-0000-4000-8000-000000000005
    await queryInterface.bulkUpdate(
      "short_term_plans",
      {
        title: "የማዕድን ኢትዮጵያ ጂኦሎጂካል ሰርቨይ ኢንስቲትዩት የ100 ቀን ዕቅድ የድርጊት መርሃ ግብር",
        government_structure_id: "10000000-0000-4000-8000-000000000005",
        configuration_id: defaultConfId,
        duration_days: 100,
      },
      {
        short_term_plan_id: "476e2690-d7c0-4bcf-84bc-9b9fb72ed8da",
      }
    );

    // Also link other existing plans to this default configuration
    await queryInterface.bulkUpdate(
      "short_term_plans",
      {
        configuration_id: defaultConfId,
        duration_days: 100,
      },
      {
        configuration_id: null,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("short_term_plans", "duration_days");
    await queryInterface.removeColumn("short_term_plans", "configuration_id");
    await queryInterface.dropTable("short_term_plan_configurations");
  },
};
