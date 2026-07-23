"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 07 — Form Field System.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "form_field_groups", {
      group_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      model_name: { type: Sequelize.STRING(64), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      diagnosis_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_form_configs", key: "config_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      diagnosis_template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "form_field_groups", ["model_name"]);
    await safeAddIndex(queryInterface, "form_field_groups", [
      "model_name",
      "sort_order",
    ]);

    await createTableIfNotExists(queryInterface, "form_fields", {
      field_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      model_name: { type: Sequelize.STRING(64), allowNull: false },
      field_key: { type: Sequelize.STRING(64), allowNull: false },
      label: { type: Sequelize.STRING(255), allowNull: false },
      field_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      storage_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "custom",
      },
      category: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "General",
      },
      group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "form_field_groups", key: "group_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      diagnosis_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_form_configs", key: "config_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      diagnosis_template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      config: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "form_fields", ["model_name"]);
    await safeAddIndex(queryInterface, "form_fields", ["group_id"]);
    await safeAddIndex(
      queryInterface,
      "form_fields",
      ["model_name", "category"],
      { name: "form_fields_model_name_category" }
    );

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS form_fields_patient_field_key_unique
      ON form_fields (model_name, field_key)
      WHERE diagnosis_config_id IS NULL AND diagnosis_template_id IS NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS form_fields_diagnosis_field_key_unique
      ON form_fields (model_name, field_key, diagnosis_config_id)
      WHERE diagnosis_config_id IS NOT NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS form_fields_diagnosis_template_field_key_unique
      ON form_fields (model_name, field_key, diagnosis_template_id)
      WHERE diagnosis_template_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "form_fields");
    await dropTableIfExists(queryInterface, "form_field_groups");
  },
};
