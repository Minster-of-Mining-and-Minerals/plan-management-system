"use strict";
const { Model } = require("sequelize");

const ESCALATION_STATUSES = [
  "escalated",
  "under_federal_review",
  "clarification_requested",
  "assistance_provided",
  "returned",
  "closed",
  "recalled",
];

const ASSISTANCE_TYPES = [
  "technical_support",
  "policy_clarification",
  "legal_clarification",
  "financial_intervention",
  "security_assistance",
  "other",
];

module.exports = (sequelize, DataTypes) => {
  class RegionalIssueEscalation extends Model {
    static associate(models) {
      RegionalIssueEscalation.belongsTo(models.RegionalIssue, {
        foreignKey: "regional_issue_id",
        as: "regionalIssue",
      });
      RegionalIssueEscalation.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
      });
      RegionalIssueEscalation.belongsTo(models.User, {
        foreignKey: "escalated_by",
        as: "escalator",
      });
      RegionalIssueEscalation.belongsTo(models.User, {
        foreignKey: "federal_assigned_to",
        as: "federalAssignee",
      });
      RegionalIssueEscalation.belongsTo(models.User, {
        foreignKey: "recalled_by",
        as: "recaller",
      });
      RegionalIssueEscalation.hasMany(models.RegionalIssueEscalationMessage, {
        foreignKey: "escalation_id",
        as: "messages",
      });
    }
  }

  RegionalIssueEscalation.init(
    {
      escalation_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: { type: DataTypes.UUID, allowNull: false },
      region_id: { type: DataTypes.UUID, allowNull: false },
      escalation_number: { type: DataTypes.STRING(35), allowNull: false, unique: true },
      escalated_by: { type: DataTypes.UUID, allowNull: false },
      escalated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      escalation_reason: { type: DataTypes.TEXT, allowNull: false },
      requested_assistance: { type: DataTypes.TEXT, allowNull: false },
      assistance_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "technical_support",
      },
      escalation_priority: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "high",
      },
      escalation_status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "escalated",
      },
      federal_assigned_to: { type: DataTypes.UUID, allowNull: true },
      federal_response_summary: { type: DataTypes.TEXT, allowNull: true },
      federal_action_taken: { type: DataTypes.TEXT, allowNull: true },
      returned_reason: { type: DataTypes.TEXT, allowNull: true },
      recalled_at: { type: DataTypes.DATE, allowNull: true },
      recalled_by: { type: DataTypes.UUID, allowNull: true },
      recall_reason: { type: DataTypes.TEXT, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      selected_attachment_ids: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "RegionalIssueEscalation",
      tableName: "regional_issue_escalations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  RegionalIssueEscalation.ESCALATION_STATUSES = ESCALATION_STATUSES;
  RegionalIssueEscalation.ASSISTANCE_TYPES = ASSISTANCE_TYPES;
  return RegionalIssueEscalation;
};

