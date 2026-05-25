"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FormFieldGroup extends Model {
    static associate(models) {
      FormFieldGroup.hasMany(models.FormField, {
        foreignKey: "group_id",
        as: "fields",
      });
    }
  }

  FormFieldGroup.init(
    {
      group_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      model_name: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_visible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "FormFieldGroup",
      tableName: "form_field_groups",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      indexes: [
        { fields: ["model_name"] },
        { fields: ["model_name", "sort_order"] },
      ],
    }
  );

  return FormFieldGroup;
};
