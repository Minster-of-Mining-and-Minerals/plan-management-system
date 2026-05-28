"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalHistoryLog extends Model {
    static associate(models) {
      MedicalHistoryLog.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      MedicalHistoryLog.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      MedicalHistoryLog.belongsTo(models.User, {
        foreignKey: "sender_staff_id",
        as: "sender",
      });
      MedicalHistoryLog.belongsTo(models.User, {
        foreignKey: "receiver_staff_id",
        as: "receiver",
      });
      MedicalHistoryLog.belongsTo(models.DiagnosisFormConfig, {
        foreignKey: "form_config_id",
        as: "formConfig",
      });
      MedicalHistoryLog.belongsTo(models.MedicalHistoryLog, {
        foreignKey: "parent_log_id",
        as: "parentLog",
      });
    }
  }

  MedicalHistoryLog.init(
    {
      log_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      sender_staff_id: { type: DataTypes.UUID, allowNull: false },
      receiver_staff_id: { type: DataTypes.UUID, allowNull: true },
      action_type: { type: DataTypes.STRING(32), allowNull: false },
      header_title: { type: DataTypes.STRING(255), allowNull: false },
      form_config_id: { type: DataTypes.UUID, allowNull: true },
      form_data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      attachment_ids: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false },
      parent_log_id: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "MedicalHistoryLog",
      tableName: "medical_history_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicalHistoryLog;
};
