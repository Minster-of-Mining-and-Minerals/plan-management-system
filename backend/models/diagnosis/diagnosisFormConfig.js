"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DiagnosisFormConfig extends Model {
    static associate(models) {
      DiagnosisFormConfig.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "staff",
        constraints: false,
      });
      DiagnosisFormConfig.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
        constraints: false,
      });
      DiagnosisFormConfig.belongsTo(models.DiagnosisTemplate, {
        foreignKey: "source_template_id",
        as: "sourceTemplate",
        constraints: false,
      });
      DiagnosisFormConfig.hasMany(models.FormFieldGroup, {
        foreignKey: "diagnosis_config_id",
        as: "groups",
      });
      DiagnosisFormConfig.hasMany(models.DiagnosisRecord, {
        foreignKey: "form_config_id",
        as: "records",
      });
    }
  }

  DiagnosisFormConfig.init(
    {
      config_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assigned_staff_id: { type: DataTypes.UUID, allowNull: true },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "Diagnosis Form",
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
      source_template_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "DiagnosisFormConfig",
      tableName: "diagnosis_form_configs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return DiagnosisFormConfig;
};
