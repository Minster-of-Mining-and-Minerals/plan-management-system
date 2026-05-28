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
      admitted_by: { type: DataTypes.UUID, allowNull: true },
      admitted_at: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "admitted",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
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
