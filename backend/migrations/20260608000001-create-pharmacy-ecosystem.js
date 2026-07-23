"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/** Baseline 15 — Pharmacy Ecosystem */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_account_type" ADD VALUE IF NOT EXISTS 'PHARMACY';`
    ).catch(() => {});

    await createTableIfNotExists(queryInterface, "pharmacies", {
      pharmacy_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      pharmacy_name: { type: Sequelize.STRING(200), allowNull: false },
      pharmacy_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      license_number: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      region: { type: Sequelize.STRING(100), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: true },
      contact_person: { type: Sequelize.STRING(150), allowNull: true },
      logo: { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    await createTableIfNotExists(queryInterface, "pharmacy_user_profiles", {
      pharmacy_user_profile_id: {
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
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "pharmacies", key: "pharmacy_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      portal_role: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "staff",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    await createTableIfNotExists(queryInterface, "pharmacy_prescriptions", {
      pharmacy_prescription_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      original_prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescriptions", key: "prescription_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "pharmacies", key: "pharmacy_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      prescriber_id: { type: Sequelize.UUID, allowNull: false },
      source_rendered_html: { type: Sequelize.TEXT, allowNull: true },
      source_notes: { type: Sequelize.TEXT, allowNull: true },
      source_header_title: { type: Sequelize.STRING(255), allowNull: true },
      patient_snapshot: { type: Sequelize.JSONB, allowNull: true },
      prescriber_snapshot: { type: Sequelize.JSONB, allowNull: true },
      pharmacy_status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "received",
      },
      pharmacy_notes: { type: Sequelize.TEXT, allowNull: true },
      sent_by: { type: Sequelize.UUID, allowNull: true },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      received_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      current_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    await createTableIfNotExists(queryInterface, "pharmacy_prescription_items", {
      pharmacy_prescription_item_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      pharmacy_prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "pharmacy_prescriptions",
          key: "pharmacy_prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      source_prescription_item_id: { type: Sequelize.UUID, allowNull: true },
      item_name: { type: Sequelize.STRING(255), allowNull: false },
      strength: { type: Sequelize.STRING(100), allowNull: true },
      route: { type: Sequelize.STRING(100), allowNull: true },
      dosage: { type: Sequelize.STRING(100), allowNull: true },
      frequency: { type: Sequelize.STRING(100), allowNull: true },
      duration: { type: Sequelize.STRING(100), allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      quantity: { type: Sequelize.STRING(50), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      dispensed_quantity: { type: Sequelize.STRING(50), allowNull: true },
      pharmacy_item_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      substitution_notes: { type: Sequelize.TEXT, allowNull: true },
      pharmacy_notes: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });

    await createTableIfNotExists(queryInterface, "pharmacy_prescription_versions", {
      pharmacy_prescription_version_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      pharmacy_prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "pharmacy_prescriptions",
          key: "pharmacy_prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      version_number: { type: Sequelize.INTEGER, allowNull: false },
      status_before: { type: Sequelize.STRING(40), allowNull: true },
      status_after: { type: Sequelize.STRING(40), allowNull: false },
      change_summary: { type: Sequelize.TEXT, allowNull: true },
      items_snapshot: { type: Sequelize.JSONB, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await createTableIfNotExists(queryInterface, "prescription_fulfillments", {
      fulfillment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      pharmacy_prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "pharmacy_prescriptions",
          key: "pharmacy_prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      fulfilled_by: { type: Sequelize.UUID, allowNull: true },
      fulfillment_status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "completed",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      items_detail: { type: Sequelize.JSONB, allowNull: true },
      dispensed_at: { type: Sequelize.DATE, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      ...ts,
    });

    await safeAddIndex(queryInterface, "pharmacies", ["status"]);
    await safeAddIndex(queryInterface, "pharmacies", ["pharmacy_code"]);
    await safeAddIndex(queryInterface, "pharmacy_user_profiles", ["pharmacy_id"]);
    await safeAddIndex(queryInterface, "pharmacy_prescriptions", ["pharmacy_id"]);
    await safeAddIndex(queryInterface, "pharmacy_prescriptions", ["original_prescription_id"]);
    await safeAddIndex(queryInterface, "pharmacy_prescriptions", ["pharmacy_status"]);
    await safeAddIndex(
      queryInterface,
      "pharmacy_prescriptions",
      ["pharmacy_id", "original_prescription_id"],
      { unique: true, name: "pharmacy_prescriptions_pharmacy_original_unique" }
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "prescription_fulfillments");
    await dropTableIfExists(queryInterface, "pharmacy_prescription_versions");
    await dropTableIfExists(queryInterface, "pharmacy_prescription_items");
    await dropTableIfExists(queryInterface, "pharmacy_prescriptions");
    await dropTableIfExists(queryInterface, "pharmacy_user_profiles");
    await dropTableIfExists(queryInterface, "pharmacies");
  },
};
