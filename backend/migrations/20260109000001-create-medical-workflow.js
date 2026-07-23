"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "medical_history_logs", {
      log_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sender_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      receiver_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "submit",
      },
      header_title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_form_configs", key: "config_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      form_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      attachment_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "submitted",
      },
      parent_log_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "medical_history_logs", key: "log_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      task_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "CONSULTATION",
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "medical_history_logs", ["appointment_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", ["patient_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", ["sender_staff_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", ["receiver_staff_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", [
      "appointment_id",
      "created_at",
    ]);

    await createTableIfNotExists(queryInterface, "workflow_tasks", {
      task_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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
      assignee_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_by_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      medical_log_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "medical_history_logs", key: "log_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      task_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "CONSULTATION",
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "workflow_tasks", ["assignee_staff_id", "status"]);
    await safeAddIndex(queryInterface, "workflow_tasks", ["appointment_id"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "workflow_tasks");
    await dropTableIfExists(queryInterface, "medical_history_logs");
  },
};
