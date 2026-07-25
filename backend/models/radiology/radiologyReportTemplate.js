"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyReportTemplate extends Model {
    static associate(models) {
      RadiologyReportTemplate.hasMany(models.RadiologyReportTemplateSection, {
        foreignKey: "template_id",
        as: "sections",
      });
    }
  }

  RadiologyReportTemplate.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      procedure_type: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      modality: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "XRAY",
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyReportTemplate",
      tableName: "radiology_report_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyReportTemplate;
};
