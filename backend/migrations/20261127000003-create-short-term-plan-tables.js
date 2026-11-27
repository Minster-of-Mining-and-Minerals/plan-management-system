"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. short_term_plans
    await queryInterface.createTable("short_term_plans", {
      short_term_plan_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onDelete: "SET NULL",
      },
      calendar_system: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "EC",
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      duration_months: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      default_frequency: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "weekly",
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
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

    // 2. short_term_kpis
    await queryInterface.createTable("short_term_kpis", {
      short_term_kpi_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      short_term_plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "short_term_plans", key: "short_term_plan_id" },
        onDelete: "CASCADE",
      },
      code: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: "Number",
      },
      total_target: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_mode: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "cumulative",
      },
      reporting_frequency: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "weekly",
      },
      requires_numeric: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      requires_narrative: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      allow_narrative_only_updates: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    // 3. short_term_kpi_assignments
    await queryInterface.createTable("short_term_kpi_assignments", {
      assignment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      short_term_kpi_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "short_term_kpis", key: "short_term_kpi_id" },
        onDelete: "CASCADE",
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "government_structures", key: "government_structure_id" },
        onDelete: "CASCADE",
      },
      internal_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "internal_structures", key: "internal_structure_id" },
        onDelete: "SET NULL",
      },
      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onDelete: "SET NULL",
      },
      assignee_label: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      allocated_target: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      period_targets: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      reporting_frequency_override: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "active",
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
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

    // 4. short_term_period_reports
    await queryInterface.createTable("short_term_period_reports", {
      report_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "short_term_kpi_assignments", key: "assignment_id" },
        onDelete: "CASCADE",
      },
      short_term_kpi_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "short_term_kpis", key: "short_term_kpi_id" },
        onDelete: "CASCADE",
      },
      period_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      period_label: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      period_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      period_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      submission_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "actual_and_narrative", // narrative_only | actual_and_narrative
      },
      planned_target: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      reported_actual: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      achievement_percent: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      narrative: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      evidence_attachments: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      submitted_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      review_status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "submitted",
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable("short_term_period_reports");
    await queryInterface.dropTable("short_term_kpi_assignments");
    await queryInterface.dropTable("short_term_kpis");
    await queryInterface.dropTable("short_term_plans");
  },
};
