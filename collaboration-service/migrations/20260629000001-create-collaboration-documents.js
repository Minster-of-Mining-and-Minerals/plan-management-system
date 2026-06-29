"use strict";

const { createTableIfNotExists, dropTablesInOrder, dropEnumTypes } = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "documents", {
      document_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      mime_type: { type: Sequelize.STRING(100), allowNull: false },
      file_type: {
        type: Sequelize.ENUM("docx", "xlsx", "pptx", "pdf"),
        allowNull: false,
        defaultValue: "docx",
      },
      file_size: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      document_key: { type: Sequelize.STRING(64), allowNull: false },
      version_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: Sequelize.ENUM("draft", "finalized"),
        allowNull: false,
        defaultValue: "draft",
      },
      owner_app: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "plan-management" },
      owner_type: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "standalone" },
      owner_id: { type: Sequelize.UUID, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "document_versions", {
      document_version_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "documents", key: "document_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      version_number: { type: Sequelize.INTEGER, allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      document_key: { type: Sequelize.STRING(64), allowNull: false },
      saved_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents (owner_app, owner_type, owner_id)`
    );
  },

  async down(queryInterface) {
    await dropTablesInOrder(queryInterface, ["document_versions", "documents"]);
    await dropEnumTypes(queryInterface, ["enum_documents_file_type", "enum_documents_status"]);
  },
};
