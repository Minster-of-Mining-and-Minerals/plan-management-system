"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalConfigurationGovernanceLog extends Model {
    static associate(models) {
      ClinicalConfigurationGovernanceLog.belongsTo(models.User, {
        foreignKey: "actor_user_id",
        as: "actorUser",
      });
    }
  }

  ClinicalConfigurationGovernanceLog.init(
    {
      governance_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenant_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" },
      entity_type: { type: DataTypes.STRING(64), allowNull: false },
      entity_id: { type: DataTypes.STRING(128), allowNull: false },
      entity_code: { type: DataTypes.STRING(64), allowNull: false },
      version: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "1.0.0" },
      previous_status: { type: DataTypes.STRING(32), allowNull: true },
      new_status: { type: DataTypes.STRING(32), allowNull: false },
      validation_summary_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      impact_analysis_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      actor_user_id: { type: DataTypes.UUID, allowNull: true },
      reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalConfigurationGovernanceLog",
      tableName: "clinical_configuration_governance_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalConfigurationGovernanceLog;
};
