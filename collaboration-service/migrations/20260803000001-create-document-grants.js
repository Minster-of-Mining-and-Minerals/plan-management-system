"use strict";

const { createTableIfNotExists, dropTablesInOrder, dropEnumTypes } = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "document_grants", {
      document_grant_id: {
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
      principal_type: {
        type: Sequelize.ENUM("user", "permission_group"),
        allowNull: false,
      },
      principal_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM("viewer", "editor", "manager"),
        allowNull: false,
        defaultValue: "viewer",
      },
      granted_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_document_grants_principal
       ON document_grants (document_id, principal_type, principal_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_document_grants_document
       ON document_grants (document_id)`
    );
  },

  async down(queryInterface) {
    await dropTablesInOrder(queryInterface, ["document_grants"]);
    await dropEnumTypes(queryInterface, [
      "enum_document_grants_principal_type",
      "enum_document_grants_role",
    ]);
  },
};
