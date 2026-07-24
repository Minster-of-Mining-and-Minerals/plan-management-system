"use strict";

const {
  createTableIfNotExists,
  dropTableIfExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. clinical_orders
    await createTableIfNotExists(queryInterface, "clinical_orders", {
      order_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ordered_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "departments", key: "department_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      assigned_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      order_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "LABORATORY",
      },
      priority: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "ROUTINE",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "SUBMITTED",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      clinical_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      order_items: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await safeAddIndex(queryInterface, "clinical_orders", ["appointment_id"]);
    await safeAddIndex(queryInterface, "clinical_orders", ["patient_id"]);
    await safeAddIndex(queryInterface, "clinical_orders", ["assigned_department_id"]);
    await safeAddIndex(queryInterface, "clinical_orders", ["status"]);

    // 2. clinical_order_results
    await createTableIfNotExists(queryInterface, "clinical_order_results", {
      result_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "clinical_orders", key: "order_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recorded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      verification_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "FINAL",
      },
      result_summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      result_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await safeAddIndex(queryInterface, "clinical_order_results", ["order_id"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "clinical_order_results");
    await dropTableIfExists(queryInterface, "clinical_orders");
  },
};
