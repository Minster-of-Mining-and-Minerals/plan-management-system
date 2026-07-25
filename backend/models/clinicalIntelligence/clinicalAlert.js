"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalAlert extends Model {
    static associate(models) {
      ClinicalAlert.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      ClinicalAlert.belongsTo(models.User, {
        foreignKey: "acknowledged_by",
        as: "acknowledger",
      });
      ClinicalAlert.belongsTo(models.User, {
        foreignKey: "action_taken_by",
        as: "actionTaker",
      });
      ClinicalAlert.belongsTo(models.User, {
        foreignKey: "dismissed_by",
        as: "dismisser",
      });
    }
  }

  ClinicalAlert.init(
    {
      alert_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      alert_type: { type: DataTypes.STRING(80), allowNull: false },
      domain: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "GENERAL",
      },
      severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "WARNING", // INFO, WARNING, CRITICAL
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      recommendation: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "OPEN", // OPEN, ACKNOWLEDGED, ACTION_TAKEN, DISMISSED
      },
      acknowledged_by: { type: DataTypes.UUID, allowNull: true },
      acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      action_taken_by: { type: DataTypes.UUID, allowNull: true },
      action_taken_at: { type: DataTypes.DATE, allowNull: true },
      dismissed_by: { type: DataTypes.UUID, allowNull: true },
      dismissed_at: { type: DataTypes.DATE, allowNull: true },
      source_rule_id: { type: DataTypes.UUID, allowNull: true },
      source_entity_type: { type: DataTypes.STRING(80), allowNull: true },
      source_entity_id: { type: DataTypes.UUID, allowNull: true },
      metadata_json: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalAlert",
      tableName: "clinical_alerts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalAlert;
};
