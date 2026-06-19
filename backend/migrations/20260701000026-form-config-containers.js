"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  createTableIfNotExists,
  addColumnIfNotExists,
  dropTablesInOrder,
  dropIndexIfExists,
} = require("./helpers/schemaHelpers");

const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "EMAIL",
  "PHONE",
  "DATE",
  "DATETIME",
  "TIME",
  "SELECT",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
  "BOOLEAN",
  "FILE",
  "IMAGE",
  "ATTACHMENT",
  "URL",
  "PASSWORD",
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "form_config_containers", {
      form_config_container_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      issue_category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "issue_categories", key: "issue_category_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      version_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
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
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "form_config_fields", {
      form_config_field_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      form_config_container_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "form_config_containers", key: "form_config_container_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      label: { type: Sequelize.STRING(200), allowNull: false },
      field_key: { type: Sequelize.STRING(80), allowNull: false },
      placeholder: { type: Sequelize.STRING(255), allowNull: true },
      help_text: { type: Sequelize.TEXT, allowNull: true },
      field_type: {
        type: Sequelize.ENUM(...FIELD_TYPES),
        allowNull: false,
        defaultValue: "TEXT",
      },
      required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      default_value: { type: Sequelize.TEXT, allowNull: true },
      validation_rules: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      options: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "issue_form_responses", {
      issue_form_response_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "issues", key: "issue_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      form_config_field_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "form_config_fields", key: "form_config_field_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      value_text: { type: Sequelize.TEXT, allowNull: true },
      value_json: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_form_config_fields_container_key
      ON form_config_fields (form_config_container_id, field_key)
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_form_responses_issue_field
      ON issue_form_responses (issue_id, form_config_field_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_form_config_containers_published
      ON form_config_containers (is_active, is_published, display_order)
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_form_config_containers_category
      ON form_config_containers (issue_category_id)
      WHERE issue_category_id IS NOT NULL
    `);

    await addColumnIfNotExists(queryInterface, "issue_categories", "form_config_container_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "form_config_containers", key: "form_config_container_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    const { removeColumnIfExists } = require("./helpers/schemaHelpers");
    await removeColumnIfExists(queryInterface, "issue_categories", "form_config_container_id");

    await dropIndexIfExists(queryInterface, "form_config_containers", "idx_form_config_containers_published");
    await dropIndexIfExists(queryInterface, "issue_form_responses", "uq_issue_form_responses_issue_field");
    await dropIndexIfExists(queryInterface, "form_config_fields", "uq_form_config_fields_container_key");

    await dropTablesInOrder(queryInterface, [
      "issue_form_responses",
      "form_config_fields",
      "form_config_containers",
    ]);

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_form_config_fields_field_type" CASCADE`);
  },
};
