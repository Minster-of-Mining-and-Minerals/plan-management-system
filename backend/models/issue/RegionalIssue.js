"use strict";
const { Model } = require("sequelize");

const REGIONAL_ISSUE_STATUSES = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "resolved",
  "closed",
];

const REGIONAL_ESCALATION_STATUSES = [
  "none",
  "escalated",
  "under_federal_review",
  "clarification_requested",
  "assistance_provided",
  "returned",
  "closed",
];

module.exports = (sequelize, DataTypes) => {
  class RegionalIssue extends Model {
    static associate(models) {
      RegionalIssue.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
      });
      RegionalIssue.belongsTo(models.RegionalStructure, {
        foreignKey: "regional_structure_id",
        as: "regionalStructure",
      });
      RegionalIssue.belongsTo(models.IssueCategory, {
        foreignKey: "issue_category_id",
        as: "category",
      });
      RegionalIssue.belongsTo(models.IssuePriority, {
        foreignKey: "issue_priority_id",
        as: "priority",
      });
      RegionalIssue.belongsTo(models.FormConfigContainer, {
        foreignKey: "form_config_container_id",
        as: "formConfigContainer",
      });
      RegionalIssue.belongsTo(models.User, {
        foreignKey: "raised_by",
        as: "raiser",
      });
      RegionalIssue.belongsTo(models.User, {
        foreignKey: "assigned_to",
        as: "assignee",
      });
      RegionalIssue.hasMany(models.RegionalIssueHistory, {
        foreignKey: "regional_issue_id",
        as: "histories",
      });
      RegionalIssue.hasMany(models.RegionalIssueComment, {
        foreignKey: "regional_issue_id",
        as: "comments",
      });
      RegionalIssue.hasMany(models.RegionalIssueEscalation, {
        foreignKey: "regional_issue_id",
        as: "escalations",
      });
      RegionalIssue.hasOne(models.RegionalIssueEscalation, {
        foreignKey: "regional_issue_id",
        as: "activeEscalation",
      });
      RegionalIssue.belongsToMany(models.Attachment, {
        through: models.RegionalIssueAttachment,
        foreignKey: "regional_issue_id",
        otherKey: "attachment_id",
        as: "attachments",
      });
    }
  }

  RegionalIssue.init(
    {
      regional_issue_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      region_id: { type: DataTypes.UUID, allowNull: false },
      regional_structure_id: { type: DataTypes.UUID, allowNull: true },
      issue_number: { type: DataTypes.STRING(35), allowNull: false, unique: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      issue_category_id: { type: DataTypes.UUID, allowNull: true },
      issue_priority_id: { type: DataTypes.UUID, allowNull: true },
      form_config_container_id: { type: DataTypes.UUID, allowNull: true },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "submitted",
      },
      escalation_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "none",
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
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "RegionalIssue",
      tableName: "regional_issues",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RegionalIssue.REGIONAL_ISSUE_STATUSES = REGIONAL_ISSUE_STATUSES;
  RegionalIssue.REGIONAL_ESCALATION_STATUSES = REGIONAL_ESCALATION_STATUSES;
  return RegionalIssue;
};
