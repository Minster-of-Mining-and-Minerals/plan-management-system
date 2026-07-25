"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyReportTemplateSection extends Model {
    static associate(models) {
      RadiologyReportTemplateSection.belongsTo(models.RadiologyReportTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
    }
  }

  RadiologyReportTemplateSection.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      section_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      default_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyReportTemplateSection",
      tableName: "radiology_report_template_sections",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyReportTemplateSection;
};
