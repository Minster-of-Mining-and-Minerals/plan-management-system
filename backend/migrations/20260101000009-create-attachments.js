"use strict";

const {
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 09 — File attachments.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "attachments", {
      attachment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      resource_type: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await safeAddIndex(queryInterface, "attachments", ["resource_type", "resource_id"], {
      name: "idx_attachments_resource",
    });
    await safeAddIndex(queryInterface, "attachments", ["patient_id"], {
      name: "idx_attachments_patient_id",
    });
    await safeAddIndex(queryInterface, "attachments", ["uploaded_by"], {
      name: "idx_attachments_uploaded_by",
    });
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "attachments");
  },
};
