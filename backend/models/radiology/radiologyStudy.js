"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyStudy extends Model {
    static associate(models) {
      RadiologyStudy.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      RadiologyStudy.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      RadiologyStudy.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      RadiologyStudy.belongsTo(models.RadiologyProcedureCatalog, {
        foreignKey: "procedure_catalog_id",
        as: "procedureCatalog",
      });
      RadiologyStudy.belongsTo(models.User, {
        foreignKey: "assigned_radiographer_id",
        as: "assignedRadiographer",
      });
      RadiologyStudy.belongsTo(models.User, {
        foreignKey: "assigned_radiologist_id",
        as: "assignedRadiologist",
      });
      RadiologyStudy.hasOne(models.RadiologyReport, {
        foreignKey: "study_id",
        as: "report",
      });
      RadiologyStudy.hasMany(models.RadiologyImage, {
        foreignKey: "study_id",
        as: "images",
      });
      RadiologyStudy.hasMany(models.RadiologyStudySeries, {
        foreignKey: "study_id",
        as: "series",
      });
      RadiologyStudy.hasMany(models.RadiologyClinicalReview, {
        foreignKey: "study_id",
        as: "reviews",
      });
    }
  }

  RadiologyStudy.init(
    {
      study_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      procedure_catalog_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      accession_number: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      modality: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "XRAY",
      },
      workflow_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "ORDERED",
      },
      scheduled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      performed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      assigned_radiographer_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assigned_radiologist_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyStudy",
      tableName: "radiology_studies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyStudy;
};
