"use strict";

const {
  createTableIfNotExists,
  dropTablesInOrder,
  dropIndexIfExists,
  dropEnumTypes,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "plan_rules", {
      plan_rule_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "plan_rule_steps", {
      plan_rule_step_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_rule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_rules", key: "plan_rule_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      step_order: { type: Sequelize.INTEGER, allowNull: false },
      node_type: {
        type: Sequelize.ENUM("strategic", "goal", "kpi", "task"),
        allowNull: false,
      },
      label: { type: Sequelize.STRING(255), allowNull: true },
      requires_weight: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      color_hex: { type: Sequelize.STRING(7), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_rule_steps_rule_order
      ON plan_rule_steps (plan_rule_id, step_order)
    `);

    await createTableIfNotExists(queryInterface, "plan_versions", {
      plan_version_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      year: { type: Sequelize.INTEGER, allowNull: false },
      version_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: Sequelize.ENUM("draft", "active", "completed", "finalized", "locked"),
        defaultValue: "draft",
        allowNull: false,
      },
      version_kind: {
        type: Sequelize.ENUM("master", "annual", "execution_period"),
        allowNull: false,
        defaultValue: "master",
      },
      period_label: { type: Sequelize.STRING(100), allowNull: true },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      based_on_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      parent_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      plan_rule_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_rules", key: "plan_rule_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      planning_year: { type: Sequelize.INTEGER, allowNull: true },
      sequence_index: { type: Sequelize.INTEGER, allowNull: true },
      is_locked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      finalized_at: { type: Sequelize.DATE, allowNull: true },
      annual_targets_finalized_at: { type: Sequelize.DATE, allowNull: true },
      period_subdivision_mode: {
        type: Sequelize.ENUM("quarterly", "semi_annual", "custom"),
        allowNull: true,
      },
      period_targets_finalized_at: { type: Sequelize.DATE, allowNull: true },
      process_started_at: { type: Sequelize.DATE, allowNull: true },
      draft_name: { type: Sequelize.STRING(255), allowNull: false },
      start_year: { type: Sequelize.INTEGER, allowNull: false },
      end_year: { type: Sequelize.INTEGER, allowNull: false },
      planning_duration_years: { type: Sequelize.INTEGER, allowNull: false },
      planning_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      planning_end_date: { type: Sequelize.DATEONLY, allowNull: false },
      start_month: { type: Sequelize.INTEGER, allowNull: false },
      end_month: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_versions_master_year_version_govt
      ON plan_versions (year, version_number, government_structure_id)
      WHERE version_kind = 'master'
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_versions_parent_sequence
      ON plan_versions (parent_plan_version_id, sequence_index)
      WHERE parent_plan_version_id IS NOT NULL
    `);

    await createTableIfNotExists(queryInterface, "plan_nodes", {
      plan_node_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      source_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      type: {
        type: Sequelize.ENUM("strategic", "goal", "kpi", "task"),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      weight: { type: Sequelize.FLOAT, defaultValue: 0, allowNull: false },
      weight_mode: {
        type: Sequelize.ENUM("number", "percentage", "frequency"),
        allowNull: true,
      },
      target_unit: { type: Sequelize.STRING(50), allowNull: true },
      level: { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false },
      order: { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      assignment_sharing_mode: {
        type: Sequelize.ENUM("exclusive", "shared"),
        allowNull: false,
        defaultValue: "exclusive",
      },
      annual_target: { type: Sequelize.FLOAT, allowNull: true },
      period_target: { type: Sequelize.FLOAT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_nodes_plan_version_id ON plan_nodes (plan_version_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_nodes_parent_id ON plan_nodes (parent_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_nodes_parent_title_version
      ON plan_nodes (parent_id, title, plan_version_id)
    `);
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "plan_nodes", "uq_plan_nodes_parent_title_version");
    await dropIndexIfExists(queryInterface, "plan_nodes", "idx_plan_nodes_parent_id");
    await dropIndexIfExists(queryInterface, "plan_nodes", "idx_plan_nodes_plan_version_id");
    await dropIndexIfExists(queryInterface, "plan_versions", "uq_plan_versions_parent_sequence");
    await dropIndexIfExists(queryInterface, "plan_versions", "uq_plan_versions_master_year_version_govt");
    await dropIndexIfExists(queryInterface, "plan_versions", "uq_plan_versions_year_version_govt");
    await dropIndexIfExists(queryInterface, "plan_versions", "plan_versions_year_version_govt_unique");
    await dropIndexIfExists(queryInterface, "plan_rule_steps", "uq_plan_rule_steps_rule_order");

    await dropTablesInOrder(queryInterface, [
      "plan_nodes",
      "plan_versions",
      "plan_rule_steps",
      "plan_rules",
    ]);

    await dropEnumTypes(queryInterface, [
      "enum_plan_nodes_assignment_sharing_mode",
      "enum_plan_nodes_weight_mode",
      "enum_plan_nodes_type",
      "enum_plan_versions_period_subdivision_mode",
      "enum_plan_versions_version_kind",
      "enum_plan_versions_status",
      "enum_plan_rule_steps_node_type",
    ]);
  },
};
