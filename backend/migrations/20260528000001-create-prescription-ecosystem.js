"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/** Baseline 14 — Prescription Ecosystem */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    // 1. prescription_categories
    await createTableIfNotExists(queryInterface, "prescription_categories", {
      category_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescription_categories", ["status"]);

    // 2. prescription_templates
    await createTableIfNotExists(queryInterface, "prescription_templates", {
      template_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "prescription_categories",
          key: "category_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: true, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "departments", key: "department_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      template_type: { type: Sequelize.STRING(64), allowNull: true },
      template_content: { type: Sequelize.TEXT, allowNull: true },
      has_template_signature: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      template_signature_file: { type: Sequelize.STRING(500), allowNull: true },
      allow_user_signature_override: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescription_templates", ["status"]);
    await safeAddIndex(queryInterface, "prescription_templates", ["category_id"]);

    // 3. prescription_template_items
    await createTableIfNotExists(queryInterface, "prescription_template_items", {
      item_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescription_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      item_name: { type: Sequelize.STRING(255), allowNull: false },
      strength: { type: Sequelize.STRING(120), allowNull: true },
      route: { type: Sequelize.STRING(120), allowNull: true },
      dosage: { type: Sequelize.STRING(120), allowNull: true },
      frequency: { type: Sequelize.STRING(120), allowNull: true },
      duration: { type: Sequelize.STRING(120), allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      quantity: { type: Sequelize.STRING(64), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescription_template_items", ["template_id"]);

    // 4. prescription_document_templates
    await createTableIfNotExists(queryInterface, "prescription_document_templates", {
      document_template_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      category_id: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      html_content: { type: Sequelize.TEXT, allowNull: false },
      header_json: { type: Sequelize.JSONB, allowNull: true },
      footer_json: { type: Sequelize.JSONB, allowNull: true },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    // 5. prescriptions
    await createTableIfNotExists(queryInterface, "prescriptions", {
      prescription_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
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
      prescriber_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      diagnosis_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_records", key: "diagnosis_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "prescription_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      prescription_number: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      valid_until: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      signature_snapshot: { type: Sequelize.JSONB, allowNull: true },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescriptions", ["patient_id"]);
    await safeAddIndex(queryInterface, "prescriptions", ["prescriber_id"]);
    await safeAddIndex(queryInterface, "prescriptions", ["appointment_id"]);
    await safeAddIndex(queryInterface, "prescriptions", ["status"]);

    // 6. prescription_items
    await createTableIfNotExists(queryInterface, "prescription_items", {
      prescription_item_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescriptions", key: "prescription_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      medication_name: { type: Sequelize.STRING(255), allowNull: false },
      generic_name: { type: Sequelize.STRING(255), allowNull: true },
      drug_code: { type: Sequelize.STRING(64), allowNull: true },
      dosage: { type: Sequelize.STRING(100), allowNull: false },
      dosage_unit: { type: Sequelize.STRING(32), allowNull: true },
      route: { type: Sequelize.STRING(64), allowNull: true },
      frequency: { type: Sequelize.STRING(100), allowNull: false },
      duration: { type: Sequelize.STRING(64), allowNull: true },
      quantity: { type: Sequelize.STRING(64), allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      dispensing_unit: { type: Sequelize.STRING(32), allowNull: true },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescription_items", ["prescription_id"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "prescription_items");
    await dropTableIfExists(queryInterface, "prescriptions");
    await dropTableIfExists(queryInterface, "prescription_document_templates");
    await dropTableIfExists(queryInterface, "prescription_template_items");
    await dropTableIfExists(queryInterface, "prescription_templates");
    await dropTableIfExists(queryInterface, "prescription_categories");
  },
};
