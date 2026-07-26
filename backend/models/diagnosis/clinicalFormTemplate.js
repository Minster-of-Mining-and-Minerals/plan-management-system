"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalFormTemplate extends Model {
    static associate(models) {
      if (models.FormFieldGroup) {
        ClinicalFormTemplate.hasMany(models.FormFieldGroup, {
          foreignKey: "diagnosis_config_id",
          as: "groups",
          constraints: false,
        });
      }
      if (models.DiagnosisRecord) {
        ClinicalFormTemplate.hasMany(models.DiagnosisRecord, {
          foreignKey: "form_config_id",
          as: "records",
          constraints: false,
        });
      }
    }
  }

  ClinicalFormTemplate.init(
    {
      template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: "config_id",
      },
      assigned_staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      tenant_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: "DEFAULT_HOSPITAL",
      },
      facility_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Clinical Form Template",
      },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalFormTemplate",
      tableName: "diagnosis_form_configs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalFormTemplate;
};
