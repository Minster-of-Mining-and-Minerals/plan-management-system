"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalAuditEvent extends Model {
    static associate(models) {
      ClinicalAuditEvent.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalAuditEvent.belongsTo(models.User, {
        foreignKey: "actor_id",
        as: "actor",
      });
    }
  }

  ClinicalAuditEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      event_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      domain: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      actor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      actor_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      previous_value_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      new_value_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      metadata_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ClinicalAuditEvent",
      tableName: "clinical_audit_events",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalAuditEvent;
};
