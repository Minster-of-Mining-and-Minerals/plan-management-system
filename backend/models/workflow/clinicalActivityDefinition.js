"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalActivityDefinition extends Model {
    static associate(models) {
      ClinicalActivityDefinition.belongsTo(models.DiagnosisFormConfig, {
        foreignKey: "form_config_id",
        as: "sourceFormConfig",
      });
      ClinicalActivityDefinition.belongsTo(models.DiagnosisFormConfig, {
        foreignKey: "execution_form_config_id",
        as: "executionFormConfig",
      });
      ClinicalActivityDefinition.belongsTo(models.DiagnosisFormConfig, {
        foreignKey: "result_form_config_id",
        as: "resultFormConfig",
      });
    }
  }

  ClinicalActivityDefinition.init(
    {
      activity_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(128), allowNull: false },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      category: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "DIAGNOSTIC" },
      department_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "GENERAL" },
      activity_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "ORDER" },
      form_config_id: { type: DataTypes.UUID, allowNull: true },
      creates_clinical_order: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      order_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "LABORATORY" },
      default_priority: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "ROUTINE" },
      sla_configuration: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { target_minutes: 60, warning_threshold_minutes: 45 },
      },
      billing_configuration: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { is_billable: true, default_fee: 0 },
      },
      execution_form_config_id: { type: DataTypes.UUID, allowNull: true },
      result_form_config_id: { type: DataTypes.UUID, allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "ACTIVE" },
    },
    {
      sequelize,
      modelName: "ClinicalActivityDefinition",
      tableName: "clinical_activity_definitions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalActivityDefinition;
};
