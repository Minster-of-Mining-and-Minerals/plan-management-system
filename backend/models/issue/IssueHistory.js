"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IssueHistory extends Model {
    static associate(models) {
      IssueHistory.belongsTo(models.Issue, {
        foreignKey: "issue_id",
        as: "issue",
      });
      IssueHistory.belongsTo(models.User, {
        foreignKey: "performed_by",
        as: "performer",
      });
    }
  }

  IssueHistory.init(
    {
      issue_history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      issue_id: { type: DataTypes.UUID, allowNull: false },
      action_type: { type: DataTypes.STRING(80), allowNull: false },
      field_name: { type: DataTypes.STRING(80), allowNull: true },
      old_value: { type: DataTypes.TEXT, allowNull: true },
      new_value: { type: DataTypes.TEXT, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      performed_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "IssueHistory",
      tableName: "issue_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return IssueHistory;
};
