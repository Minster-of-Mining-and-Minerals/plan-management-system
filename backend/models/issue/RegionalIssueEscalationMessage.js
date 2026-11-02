"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalIssueEscalationMessage extends Model {
    static associate(models) {
      RegionalIssueEscalationMessage.belongsTo(models.RegionalIssueEscalation, {
        foreignKey: "escalation_id",
        as: "escalation",
      });
      RegionalIssueEscalationMessage.belongsTo(models.User, {
        foreignKey: "sender_id",
        as: "sender",
      });
    }
  }

  RegionalIssueEscalationMessage.init(
    {
      message_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      escalation_id: { type: DataTypes.UUID, allowNull: false },
      sender_id: { type: DataTypes.UUID, allowNull: false },
      sender_scope: {
        type: DataTypes.STRING(20),
        allowNull: false, // 'regional' | 'federal'
      },
      message_type: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "message", // 'message' | 'clarification_request' | 'clarification_reply' | 'official_response'
      },
      message_text: { type: DataTypes.TEXT, allowNull: false },
      attachments: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_internal_federal_note: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "RegionalIssueEscalationMessage",
      tableName: "regional_issue_escalation_messages",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RegionalIssueEscalationMessage;
};

