"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  dropEnumIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 05 — Internal & patient profiles + dynamic field values.
 * Replaces: 20260601000002–00004, 20260603000002, 20260604000002
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("internal_user_profiles", {
      profile_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      department: { type: Sequelize.STRING(128), allowNull: true },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "departments", key: "department_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      title_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "user_titles", key: "title_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      job_title: { type: Sequelize.STRING(128), allowNull: true },
      employee_id: { type: Sequelize.STRING(64), allowNull: true },
      signature_file: { type: Sequelize.STRING(500), allowNull: true },
      signature_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "internal_user_profiles", ["user_id"]);
    await safeAddIndex(
      queryInterface,
      "internal_user_profiles",
      ["department_id"]
    );
    await safeAddIndex(queryInterface, "internal_user_profiles", ["title_id"]);

    await queryInterface.createTable("patient_profiles", {
      patient_profile_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_code: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
      },
      qr_code: { type: Sequelize.TEXT, allowNull: true },
      barcode: { type: Sequelize.STRING(128), allowNull: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      gender: { type: Sequelize.STRING(32), allowNull: true },
      blood_group: { type: Sequelize.STRING(16), allowNull: true },
      marital_status: { type: Sequelize.STRING(32), allowNull: true },
      nationality: { type: Sequelize.STRING(64), allowNull: true },
      preferred_language: { type: Sequelize.STRING(32), allowNull: true },
      emergency_contacts: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      insurance_profile: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      medical_history_summary: { type: Sequelize.TEXT, allowNull: true },
      patient_status: {
        type: Sequelize.ENUM("active", "inactive", "deceased", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
      registered_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      registered_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "patient_profiles", ["user_id"]);
    await safeAddIndex(queryInterface, "patient_profiles", ["patient_code"]);
    await safeAddIndex(queryInterface, "patient_profiles", ["patient_status"]);

    await queryInterface.createTable("patient_field_values", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      field_key: { type: Sequelize.STRING(64), allowNull: false },
      value: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });

    await safeAddIndex(queryInterface, "patient_field_values", ["user_id"]);
    await safeAddIndex(
      queryInterface,
      "patient_field_values",
      ["user_id", "field_key"],
      {
        unique: true,
        name: "patient_field_values_user_id_field_key_unique",
      }
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "patient_field_values");
    await dropTableIfExists(queryInterface, "patient_profiles");
    await dropEnumIfExists(queryInterface, "enum_patient_profiles_patient_status");
    await dropTableIfExists(queryInterface, "internal_user_profiles");
  },
};
