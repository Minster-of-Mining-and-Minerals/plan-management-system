"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FormField extends Model {
    static associate() {
      // Logical definition only; values live in users (core) or user_field_values (custom).
    }
  }

  FormField.init(
    {
      field_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      model_name: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      field_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      field_type: {
        type: DataTypes.ENUM(
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
        type: DataTypes.ENUM("core", "custom"),
        allowNull: false,
        defaultValue: "custom",
      },
      category: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "General",
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_visible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: "FormField",
      tableName: "form_fields",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      indexes: [
        { fields: ["model_name"] },
        { fields: ["model_name", "category"] },
        { unique: true, fields: ["model_name", "field_key"] },
      ],
    }
  );

  return FormField;
};
