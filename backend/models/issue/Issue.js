"use strict";
const { Model } = require("sequelize");

const ISSUE_STATUSES = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "resolved",
  "closed",
];

module.exports = (sequelize, DataTypes) => {
  class Issue extends Model {
    static associate(models) {
      Issue.belongsTo(models.IssueCategory, {
        foreignKey: "issue_category_id",
        as: "category",
      });
      Issue.belongsTo(models.IssuePriority, {
        foreignKey: "issue_priority_id",
        as: "priority",
      });
      Issue.belongsTo(models.User, {
        foreignKey: "raised_by",
        as: "raiser",
      });
      Issue.belongsTo(models.User, {
        foreignKey: "assigned_to",
        as: "assignee",
      });
      Issue.hasMany(models.IssueHistory, {
        foreignKey: "issue_id",
        as: "histories",
      });
      Issue.hasMany(models.IssueFormResponse, {
        foreignKey: "issue_id",
        as: "formResponses",
      });
      Issue.belongsTo(models.FormConfigContainer, {
        foreignKey: "form_config_container_id",
        as: "formConfigContainer",
      });
      Issue.belongsToMany(models.Attachment, {
        through: models.IssueAttachment,
        foreignKey: "issue_id",
        otherKey: "attachment_id",
        as: "attachments",
      });
    }
  }

  Issue.init(
    {
      issue_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      issue_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      issue_category_id: { type: DataTypes.UUID, allowNull: false },
      issue_priority_id: { type: DataTypes.UUID, allowNull: true },
      form_config_container_id: { type: DataTypes.UUID, allowNull: true },
      status: {
        type: DataTypes.ENUM(...ISSUE_STATUSES),
        allowNull: false,
        defaultValue: "submitted",
      },
      raised_by: { type: DataTypes.UUID, allowNull: false },
      assigned_to: { type: DataTypes.UUID, allowNull: true },
      entity_type: { type: DataTypes.STRING(100), allowNull: true },
      entity_id: { type: DataTypes.UUID, allowNull: true },
      current_value: { type: DataTypes.TEXT, allowNull: true },
      suggested_value: { type: DataTypes.TEXT, allowNull: true },
      form_data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      justification: { type: DataTypes.TEXT, allowNull: true },
      response: { type: DataTypes.TEXT, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
      resolution_notes: { type: DataTypes.TEXT, allowNull: true },
      attachment_path: { type: DataTypes.STRING(500), allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      review_snapshot_id: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "Issue",
      tableName: "issues",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Issue.ISSUE_STATUSES = ISSUE_STATUSES;
  return Issue;
};
