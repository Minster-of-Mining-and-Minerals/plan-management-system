"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DiagnosisRecord extends Model {
    static associate(models) {
      DiagnosisRecord.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      DiagnosisRecord.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      DiagnosisRecord.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "staff",
      });
      DiagnosisRecord.belongsTo(models.DiagnosisFormConfig, {
        foreignKey: "form_config_id",
        as: "formConfig",
      });
    }
  }

  DiagnosisRecord.init(
    {
      diagnosis_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      assigned_staff_id: { type: DataTypes.UUID, allowNull: false },
      form_config_id: { type: DataTypes.UUID, allowNull: false },
      form_data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      clinical_intent_json: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "DiagnosisRecord",
      tableName: "diagnosis_records",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return DiagnosisRecord;
};
