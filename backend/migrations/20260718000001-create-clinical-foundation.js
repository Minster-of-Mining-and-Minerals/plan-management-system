"use strict";

const {
  timestampColumns,
  createTableIfNotExists,
  dropTableIfExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

/** Baseline 21 — Clinical Foundation (Timeline Events, Rules, Documents, Allergies) */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    // 1. timeline_events
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

    // 2. clinical_rules
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

    // 3. clinical_documents
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
      reviewer_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      approver_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      signatures: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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
    await safeAddIndex(queryInterface, "clinical_documents", ["reviewer_id"]);
    await safeAddIndex(queryInterface, "clinical_documents", ["approver_id"]);

    // 4. patient_allergies
    await createTableIfNotExists(queryInterface, "patient_allergies", {
      allergy_id: {
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
      allergen: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "MEDIUM",
      },
      reaction: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "patient_allergies", ["patient_id"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "patient_allergies");
    await dropTableIfExists(queryInterface, "clinical_documents");
    await dropTableIfExists(queryInterface, "clinical_rules");
    await dropTableIfExists(queryInterface, "timeline_events");
  },
};
