"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  dropEnumIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 06 — Patient form configuration (final shape, no User-model pivot).
 * Replaces: 20260527000001, 20260528000001, 20260529000001–00002
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("form_field_groups", {
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
      ...ts,
    });

    await safeAddIndex(queryInterface, "form_field_groups", ["model_name"]);
    await safeAddIndex(queryInterface, "form_field_groups", [
      "model_name",
      "sort_order",
    ]);

    await queryInterface.createTable("form_fields", {
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
        type: Sequelize.ENUM(
          "input",
          "textarea",
          "select",
          "file",
          "checkbox",
          "date",
          "number"
        ),
        allowNull: false,
      },
      storage_type: {
        type: Sequelize.ENUM("core", "custom"),
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
    await safeAddIndex(queryInterface, "form_fields", ["model_name", "field_key"], {
      unique: true,
      name: "form_fields_model_name_field_key_unique",
    });
    await safeAddIndex(
      queryInterface,
      "form_fields",
      ["model_name", "category"],
      { name: "form_fields_model_name_category" }
    );
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "form_fields");
    await dropEnumIfExists(queryInterface, "enum_form_fields_field_type");
    await dropEnumIfExists(queryInterface, "enum_form_fields_storage_type");
    await dropTableIfExists(queryInterface, "form_field_groups");
  },
};
