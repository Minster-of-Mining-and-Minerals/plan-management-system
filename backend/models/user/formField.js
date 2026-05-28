"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FormField extends Model {
    static associate(models) {
      FormField.belongsTo(models.FormFieldGroup, {
        foreignKey: "group_id",
        as: "group",
      });
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
      group_id: {
        type: DataTypes.UUID,
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
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      diagnosis_config_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
        { fields: ["group_id"] },
        { fields: ["model_name", "category"] },
      ],
    }
  );

  return FormField;
};
