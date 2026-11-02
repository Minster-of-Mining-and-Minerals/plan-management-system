"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalIssueComment extends Model {
    static associate(models) {
      RegionalIssueComment.belongsTo(models.RegionalIssue, {
        foreignKey: "regional_issue_id",
        as: "issue",
      });
      RegionalIssueComment.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "author",
      });
    }
  }

  RegionalIssueComment.init(
    {
      comment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: { type: DataTypes.UUID, allowNull: false },
      user_id: { type: DataTypes.UUID, allowNull: false },
      comment_text: { type: DataTypes.TEXT, allowNull: false },
      is_internal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RegionalIssueComment",
      tableName: "regional_issue_comments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RegionalIssueComment;
};

