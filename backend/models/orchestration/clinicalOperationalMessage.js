"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalOperationalMessage extends Model {
    static associate(models) {
      ClinicalOperationalMessage.belongsTo(models.ClinicalIncident, {
        foreignKey: "incident_id",
        as: "incident",
      });
      ClinicalOperationalMessage.belongsTo(models.User, {
        foreignKey: "sender_id",
        as: "sender",
      });
    }
  }

  ClinicalOperationalMessage.init(
    {
      message_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      incident_id: { type: DataTypes.UUID, allowNull: true },
      sender_id: { type: DataTypes.UUID, allowNull: true },
      recipient_role: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "OPERATIONS_MANAGER" },
      message_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "UPDATE" },
      content: { type: DataTypes.TEXT, allowNull: false },
      channel: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "HUB" },
    },
    {
      sequelize,
      modelName: "ClinicalOperationalMessage",
      tableName: "clinical_operational_messages",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalOperationalMessage;
};
