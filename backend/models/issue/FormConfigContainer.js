"use strict";
const { Model } = require("sequelize");

const { FIELD_TYPES } = require("../../utils/formConfigFieldTypes");

module.exports = (sequelize, DataTypes) => {
  class FormConfigContainer extends Model {
    static associate(models) {
      FormConfigContainer.belongsTo(models.IssueCategory, {
        foreignKey: "issue_category_id",
        as: "issueCategory",
      });
      FormConfigContainer.hasMany(models.FormConfigField, {
        foreignKey: "form_config_container_id",
        as: "fields",
      });
      FormConfigContainer.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      FormConfigContainer.belongsTo(models.User, {
        foreignKey: "updated_by",
        as: "updater",
      });
    }
  }

  FormConfigContainer.init(
    {
      form_config_container_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      issue_category_id: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      version_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "FormConfigContainer",
      tableName: "form_config_containers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  FormConfigContainer.FIELD_TYPES = FIELD_TYPES;
  return FormConfigContainer;
};
