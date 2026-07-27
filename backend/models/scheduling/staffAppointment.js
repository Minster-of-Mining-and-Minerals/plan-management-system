"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class StaffAppointment extends Model {
    static associate(models) {
      StaffAppointment.belongsTo(models.PatientSchedule, {
        foreignKey: "schedule_id",
        as: "schedule",
      });
      StaffAppointment.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      StaffAppointment.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "staff",
      });
      StaffAppointment.belongsTo(models.User, {
        foreignKey: "admitted_by",
        as: "admittedByUser",
      });
      StaffAppointment.hasMany(models.MedicalHistoryLog, {
        foreignKey: "appointment_id",
        as: "medicalHistoryLogs",
      });
      StaffAppointment.hasMany(models.WorkflowTask, {
        foreignKey: "appointment_id",
        as: "workflowTasks",
      });
      StaffAppointment.belongsTo(models.PatientLocation, {
        foreignKey: "current_location_id",
        as: "currentLocation",
      });
      StaffAppointment.belongsTo(models.ClinicalCarePlan, {
        foreignKey: "care_plan_id",
        as: "carePlan",
      });
    }
  }

  StaffAppointment.init(
    {
      appointment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      schedule_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      assigned_staff_id: { type: DataTypes.UUID, allowNull: false },
      current_location_id: { type: DataTypes.UUID, allowNull: true },
      care_plan_id: { type: DataTypes.UUID, allowNull: true },
      admitted_by: { type: DataTypes.UUID, allowNull: true },
      admitted_at: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "admitted",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      workflow_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      workflow_completed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "StaffAppointment",
      tableName: "staff_appointments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return StaffAppointment;
};
