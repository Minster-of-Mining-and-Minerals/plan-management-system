"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/** Baseline 16 — Prescription Pharmacy Forwards Ecosystem */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "prescription_pharmacy_forwards", {
      forward_id: {
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
        onDelete: "RESTRICT",
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      schedule_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "patient_schedules", key: "schedule_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "pharmacies", key: "pharmacy_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      sent_by: { type: Sequelize.UUID, allowNull: false },
      sent_at: { type: Sequelize.DATE, allowNull: false },
      forward_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "sent",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "prescription_pharmacy_forwards", ["schedule_id"]);
    await safeAddIndex(queryInterface, "prescription_pharmacy_forwards", ["prescription_id"]);
    await safeAddIndex(queryInterface, "prescription_pharmacy_forwards", ["pharmacy_id"]);
    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forwards",
      ["prescription_id"],
      { unique: true, name: "prescription_pharmacy_forwards_rx_unique" }
    );

    await createTableIfNotExists(queryInterface, "prescription_pharmacy_forward_audits", {
      audit_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      forward_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "prescription_pharmacy_forwards",
          key: "forward_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      action: { type: Sequelize.STRING(48), allowNull: false },
      changed_by: { type: Sequelize.UUID, allowNull: false },
      changed_at: { type: Sequelize.DATE, allowNull: false },
      previous_values: { type: Sequelize.JSONB, allowNull: true },
      new_values: { type: Sequelize.JSONB, allowNull: true },
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forward_audits",
      ["forward_id"]
    );

    await createTableIfNotExists(queryInterface, "prescription_pharmacy_forward_files", {
      forward_file_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      forward_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "prescription_pharmacy_forwards",
          key: "forward_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      attachment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "attachments", key: "attachment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      added_by: { type: Sequelize.UUID, allowNull: false },
      added_at: { type: Sequelize.DATE, allowNull: false },
      ...ts,
    });

    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forward_files",
      ["forward_id", "attachment_id"],
      { unique: true, name: "prescription_pharmacy_forward_files_unique" }
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "prescription_pharmacy_forward_files");
    await dropTableIfExists(queryInterface, "prescription_pharmacy_forward_audits");
    await dropTableIfExists(queryInterface, "prescription_pharmacy_forwards");
  },
};
