"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalIssueAttachment extends Model {
    static associate(models) {
      RegionalIssueAttachment.belongsTo(models.RegionalIssue, {
        foreignKey: "regional_issue_id",
        as: "issue",
      });
      RegionalIssueAttachment.belongsTo(models.Attachment, {
        foreignKey: "attachment_id",
        as: "attachment",
      });
    }
  }

  RegionalIssueAttachment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: { type: DataTypes.UUID, allowNull: false },
      attachment_id: { type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      modelName: "RegionalIssueAttachment",
      tableName: "regional_issue_attachments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return RegionalIssueAttachment;
};

