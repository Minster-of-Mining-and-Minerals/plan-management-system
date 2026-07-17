"use strict";

const {
  timestampColumns,
  createTableIfNotExists,
  safeAddColumn,
  safeRemoveColumn,
  dropTableIfExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    // 1. Create timeline_events table
    await createTableIfNotExists(queryInterface, "timeline_events", {
      event_id: {
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
        allowNull: true,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      event_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "timeline_events", ["patient_id"]);
    await safeAddIndex(queryInterface, "timeline_events", ["appointment_id"]);
    await safeAddIndex(queryInterface, "timeline_events", ["event_type"]);
    await safeAddIndex(queryInterface, "timeline_events", ["event_date"]);

    // 2. Create clinical_rules table
    await createTableIfNotExists(queryInterface, "clinical_rules", {
      rule_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      trigger_event: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "WARNING",
      },
      action: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ...ts,
    });

    // 3. Create clinical_documents table
    await createTableIfNotExists(queryInterface, "clinical_documents", {
      document_id: {
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
        allowNull: true,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      document_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      title: {
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
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      parent_document_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "clinical_documents", key: "document_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      attachment_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "clinical_documents", ["patient_id"]);
    await safeAddIndex(queryInterface, "clinical_documents", ["appointment_id"]);
    await safeAddIndex(queryInterface, "clinical_documents", ["document_type"]);

    // 4. Add columns to workflow_tasks
    await safeAddColumn(queryInterface, "workflow_tasks", "task_type", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "CONSULTATION",
    });
    await safeAddColumn(queryInterface, "workflow_tasks", "resource_type", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await safeAddColumn(queryInterface, "workflow_tasks", "resource_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // 5. Add columns to medical_history_logs
    await safeAddColumn(queryInterface, "medical_history_logs", "task_type", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "CONSULTATION",
    });
    await safeAddColumn(queryInterface, "medical_history_logs", "resource_type", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await safeAddColumn(queryInterface, "medical_history_logs", "resource_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await safeRemoveColumn(queryInterface, "medical_history_logs", "resource_id");
    await safeRemoveColumn(queryInterface, "medical_history_logs", "resource_type");
    await safeRemoveColumn(queryInterface, "medical_history_logs", "task_type");

    await safeRemoveColumn(queryInterface, "workflow_tasks", "resource_id");
    await safeRemoveColumn(queryInterface, "workflow_tasks", "resource_type");
    await safeRemoveColumn(queryInterface, "workflow_tasks", "task_type");

    await dropTableIfExists(queryInterface, "clinical_documents");
    await dropTableIfExists(queryInterface, "clinical_rules");
    await dropTableIfExists(queryInterface, "timeline_events");
  },
};
