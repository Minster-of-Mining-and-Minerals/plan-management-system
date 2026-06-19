"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FormConfigField extends Model {
    static associate(models) {
      FormConfigField.belongsTo(models.FormConfigContainer, {
        foreignKey: "form_config_container_id",
        as: "container",
      });
      FormConfigField.hasMany(models.IssueFormResponse, {
        foreignKey: "form_config_field_id",
        as: "responses",
      });
    }
  }

  FormConfigField.init(
    {
      form_config_field_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      form_config_container_id: { type: DataTypes.UUID, allowNull: false },
      label: { type: DataTypes.STRING(200), allowNull: false },
      field_key: { type: DataTypes.STRING(80), allowNull: false },
      placeholder: { type: DataTypes.STRING(255), allowNull: true },
      help_text: { type: DataTypes.TEXT, allowNull: true },
      field_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: "TEXT" },
      required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      default_value: { type: DataTypes.TEXT, allowNull: true },
      validation_rules: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      options: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    {
      sequelize,
      modelName: "FormConfigField",
      tableName: "form_config_fields",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return FormConfigField;
};
