"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

async function safeRemoveIndex(queryInterface, table, name) {
  try {
    await queryInterface.removeIndex(table, name);
  } catch {
    // index may not exist
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await safeRemoveIndex(
      queryInterface,
      "prescription_pharmacy_forwards",
      "prescription_pharmacy_forwards_unique"
    );
    await safeRemoveIndex(
      queryInterface,
      "pharmacy_prescriptions",
      "pharmacy_prescriptions_pharmacy_original_unique"
    );

    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forwards",
      ["prescription_id"],
      { unique: true, name: "prescription_pharmacy_forwards_rx_unique" }
    );
    await safeAddIndex(
      queryInterface,
      "pharmacy_prescriptions",
      ["original_prescription_id"],
      { unique: true, name: "pharmacy_prescriptions_original_unique" }
    );

    await queryInterface.createTable("prescription_pharmacy_forward_audits", {
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

    await queryInterface.createTable("prescription_pharmacy_forward_files", {
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
    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forward_audits",
      ["forward_id"]
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(
      queryInterface,
      "prescription_pharmacy_forward_files"
    );
    await dropTableIfExists(
      queryInterface,
      "prescription_pharmacy_forward_audits"
    );

    await safeRemoveIndex(
      queryInterface,
      "prescription_pharmacy_forwards",
      "prescription_pharmacy_forwards_rx_unique"
    );
    await safeRemoveIndex(
      queryInterface,
      "pharmacy_prescriptions",
      "pharmacy_prescriptions_original_unique"
    );

    await safeAddIndex(
      queryInterface,
      "prescription_pharmacy_forwards",
      ["schedule_id", "prescription_id", "pharmacy_id"],
      { unique: true, name: "prescription_pharmacy_forwards_unique" }
    );
    await safeAddIndex(
      queryInterface,
      "pharmacy_prescriptions",
      ["pharmacy_id", "original_prescription_id"],
      { unique: true, name: "pharmacy_prescriptions_pharmacy_original_unique" }
    );
  },
};
