"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalIncidentRule extends Model {
    static associate(models) {}
  }

  ClinicalIncidentRule.init(
    {
      rule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(128), allowNull: false },
      incident_type: { type: DataTypes.STRING(64), allowNull: false },
      severity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "HIGH" },
      trigger_condition: { type: DataTypes.STRING(128), allowNull: false },
      threshold_value: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      target_department: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "HOSPITAL" },
      default_owner_role: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "OPERATIONS_MANAGER" },
      is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: "ClinicalIncidentRule",
      tableName: "clinical_incident_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalIncidentRule;
};
