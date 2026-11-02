"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalIssueHistory extends Model {
    static associate(models) {
      RegionalIssueHistory.belongsTo(models.RegionalIssue, {
        foreignKey: "regional_issue_id",
        as: "issue",
      });
      RegionalIssueHistory.belongsTo(models.User, {
        foreignKey: "performed_by",
        as: "performer",
      });
    }
  }

  RegionalIssueHistory.init(
    {
      history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: { type: DataTypes.UUID, allowNull: false },
      action_type: { type: DataTypes.STRING(50), allowNull: false },
      field_name: { type: DataTypes.STRING(100), allowNull: true },
      old_value: { type: DataTypes.TEXT, allowNull: true },
      new_value: { type: DataTypes.TEXT, allowNull: true },
      performed_by: { type: DataTypes.UUID, allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "RegionalIssueHistory",
      tableName: "regional_issue_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return RegionalIssueHistory;
};

