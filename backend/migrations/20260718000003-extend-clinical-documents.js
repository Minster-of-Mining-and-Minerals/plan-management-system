"use strict";

const {
  safeAddColumn,
  safeRemoveColumn,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    await safeAddColumn(queryInterface, "clinical_documents", "reviewer_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await safeAddColumn(queryInterface, "clinical_documents", "approver_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "user_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await safeAddColumn(queryInterface, "clinical_documents", "signatures", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    await safeAddColumn(queryInterface, "clinical_documents", "metadata", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    await safeAddIndex(queryInterface, "clinical_documents", ["reviewer_id"]);
    await safeAddIndex(queryInterface, "clinical_documents", ["approver_id"]);
  },

  async down(queryInterface, Sequelize) {
    await safeRemoveColumn(queryInterface, "clinical_documents", "metadata");
    await safeRemoveColumn(queryInterface, "clinical_documents", "signatures");
    await safeRemoveColumn(queryInterface, "clinical_documents", "approver_id");
    await safeRemoveColumn(queryInterface, "clinical_documents", "reviewer_id");
  },
};
