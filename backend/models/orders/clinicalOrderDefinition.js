"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalOrderDefinition extends Model {
    static associate(models) {
      if (models.DiagnosisFormConfig) {
        ClinicalOrderDefinition.belongsTo(models.DiagnosisFormConfig, {
          foreignKey: "request_form_config_id",
          as: "requestFormConfig",
          constraints: false,
        });
        ClinicalOrderDefinition.belongsTo(models.DiagnosisFormConfig, {
          foreignKey: "execution_form_config_id",
          as: "executionFormConfig",
          constraints: false,
        });
        ClinicalOrderDefinition.belongsTo(models.DiagnosisFormConfig, {
          foreignKey: "result_form_config_id",
          as: "resultFormConfig",
          constraints: false,
        });
      }
      if (models.ClinicalFormTemplate) {
        ClinicalOrderDefinition.belongsTo(models.ClinicalFormTemplate, {
          foreignKey: "verification_form_config_id",
          as: "verificationFormTemplate",
          constraints: false,
        });
      }
    }
  }

  ClinicalOrderDefinition.init(
    {
      definition_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organization_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "DEFAULT_ORG" },
      tenant_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "DEFAULT_HOSPITAL" },
      facility_id: { type: DataTypes.UUID, allowNull: true },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      category: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "DIAGNOSTIC" },
      department_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "GENERAL" },
      activity_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "ORDER" },
      workflow_definition_id: { type: DataTypes.STRING(128), allowNull: true },
      request_form_config_id: { type: DataTypes.UUID, allowNull: true },
      execution_form_config_id: { type: DataTypes.UUID, allowNull: true },
      result_form_config_id: { type: DataTypes.UUID, allowNull: true },
      verification_form_config_id: { type: DataTypes.UUID, allowNull: true },
      billing_configuration_id: { type: DataTypes.STRING(128), allowNull: true },
      sla_configuration_id: { type: DataTypes.STRING(128), allowNull: true },
      queue_config_json: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
      sla_config_json: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
      billing_configuration: { type: DataTypes.JSONB, allowNull: true, defaultValue: { is_billable: false } },
      automation_rules_json: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
      decision_support_rules_json: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
      priority_configuration: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: { default_priority: "ROUTINE", allowed_priorities: ["ROUTINE", "URGENT", "STAT"] },
      },
      validation_rules_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      required_permissions_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "PUBLISHED" },
      version: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "1.0.0" },
    },
    {
      sequelize,
      modelName: "ClinicalOrderDefinition",
      tableName: "clinical_order_definitions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalOrderDefinition;
};
