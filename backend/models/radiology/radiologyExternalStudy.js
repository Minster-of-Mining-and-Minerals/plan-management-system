"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyExternalStudy extends Model {
    static associate(models) {
      RadiologyExternalStudy.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      RadiologyExternalStudy.belongsTo(models.User, {
        foreignKey: "uploaded_by",
        as: "uploader",
      });
    }
  }

  RadiologyExternalStudy.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      source_facility: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      study_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      modality: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "XRAY",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      report_attachment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image_reference: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RadiologyExternalStudy",
      tableName: "radiology_external_studies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyExternalStudy;
};
