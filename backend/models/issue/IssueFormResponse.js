"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IssueFormResponse extends Model {
    static associate(models) {
      IssueFormResponse.belongsTo(models.Issue, {
        foreignKey: "issue_id",
        as: "issue",
      });
      IssueFormResponse.belongsTo(models.FormConfigField, {
        foreignKey: "form_config_field_id",
        as: "field",
      });
    }
  }

  IssueFormResponse.init(
    {
      issue_form_response_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      issue_id: { type: DataTypes.UUID, allowNull: false },
      form_config_field_id: { type: DataTypes.UUID, allowNull: false },
      value_text: { type: DataTypes.TEXT, allowNull: true },
      value_json: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      sequelize,
      modelName: "IssueFormResponse",
      tableName: "issue_form_responses",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return IssueFormResponse;
};
