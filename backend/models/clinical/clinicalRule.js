"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalRule extends Model {
    static associate(models) {
      // Global configuration, no direct associations required.
    }
  }

  ClinicalRule.init(
    {
      rule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      trigger_event: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      conditions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "WARNING",
      },
      action: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ClinicalRule",
      tableName: "clinical_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalRule;
};
