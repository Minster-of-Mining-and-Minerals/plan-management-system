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
    await createTableIfNotExists(queryInterface, "plan_assignment_actions", {
      assignment_action_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_approval: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      is_execution: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      is_reporting: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "external_assignments", {
      external_assignment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      is_visible: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      requires_report: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_external_assignments_plan_node_id
      ON external_assignments (plan_node_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_external_assignments_govt_structure_id
      ON external_assignments (government_structure_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_external_assignments_active_node_govt
      ON external_assignments (plan_node_id, government_structure_id)
      WHERE is_active = true
    `);

    await createTableIfNotExists(queryInterface, "internal_assignments", {
      internal_assignment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      internal_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "internal_structures", key: "internal_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_assignment_actions", key: "assignment_action_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      branch_external_assignment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "external_assignments", key: "external_assignment_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      branch_internal_assignment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "internal_assignments", key: "internal_assignment_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_internal_assignments_plan_node_id
      ON internal_assignments (plan_node_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_internal_assignments_internal_structure_id
      ON internal_assignments (internal_structure_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_internal_assignments_user_id
      ON internal_assignments (user_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_assignments_active_node_dept
      ON internal_assignments (plan_node_id, internal_structure_id)
      WHERE is_active = true AND internal_structure_id IS NOT NULL
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_assignments_active_node_user
      ON internal_assignments (plan_node_id, user_id)
      WHERE is_active = true AND user_id IS NOT NULL
    `);

    await createTableIfNotExists(queryInterface, "plan_node_action_logs", {
      action_log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      action_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_assignment_actions", key: "assignment_action_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      comment: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "submitted", "approved", "rejected", "forwarded"),
        defaultValue: "pending",
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_node_action_logs_plan_node_id
      ON plan_node_action_logs (plan_node_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_node_action_logs_user_id
      ON plan_node_action_logs (user_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_node_action_logs_action_id
      ON plan_node_action_logs (action_id)
    `);
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "plan_node_action_logs", "idx_plan_node_action_logs_action_id");
    await dropIndexIfExists(queryInterface, "plan_node_action_logs", "idx_plan_node_action_logs_user_id");
    await dropIndexIfExists(queryInterface, "plan_node_action_logs", "idx_plan_node_action_logs_plan_node_id");
    await dropIndexIfExists(queryInterface, "internal_assignments", "uq_internal_assignments_active_node_user");
    await dropIndexIfExists(queryInterface, "internal_assignments", "uq_internal_assignments_active_node_dept");
    await dropIndexIfExists(queryInterface, "internal_assignments", "idx_internal_assignments_user_id");
    await dropIndexIfExists(queryInterface, "internal_assignments", "idx_internal_assignments_internal_structure_id");
    await dropIndexIfExists(queryInterface, "internal_assignments", "idx_internal_assignments_plan_node_id");
    await dropIndexIfExists(queryInterface, "external_assignments", "uq_external_assignments_active_node_govt");
    await dropIndexIfExists(queryInterface, "external_assignments", "idx_external_assignments_govt_structure_id");
    await dropIndexIfExists(queryInterface, "external_assignments", "idx_external_assignments_plan_node_id");

    await dropTablesInOrder(queryInterface, [
      "plan_node_action_logs",
      "internal_assignments",
      "external_assignments",
      "plan_assignment_actions",
    ]);

    await dropEnumTypes(queryInterface, ["enum_plan_node_action_logs_status"]);
  },
};
